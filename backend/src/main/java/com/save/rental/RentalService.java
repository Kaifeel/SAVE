package com.save.rental;

import com.save.common.BusinessException;
import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.notification.InAppNotificationService;
import com.save.review.ReviewService;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.security.CampusAccessPolicy;
import java.util.List;
import java.time.Clock;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RentalService {
    private final RentalRepository rentalRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final InAppNotificationService notificationService;
    private final ReviewService reviewService;
    private final Clock clock;
    private final CampusAccessPolicy campusAccessPolicy;

    public RentalService(RentalRepository rentalRepository, ItemRepository itemRepository,
                         UserRepository userRepository, ChatRoomRepository chatRoomRepository,
                         InAppNotificationService notificationService, ReviewService reviewService,
                         Clock clock, CampusAccessPolicy campusAccessPolicy) {
        this.rentalRepository = rentalRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.notificationService = notificationService;
        this.reviewService = reviewService;
        this.clock = clock;
        this.campusAccessPolicy = campusAccessPolicy;
    }

    @Transactional
    public RentalResponse create(Integer borrowerId, RentalCreateRequest request) {
        Item item = itemRepository.findByIdForUpdate(request.itemId())
                .filter(value -> value.getStatus() != ItemStatus.DELETED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        if (item.getOwner().getId().equals(borrowerId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인 물품은 대여 신청할 수 없습니다.");
        }
        if (item.getStatus() != ItemStatus.AVAILABLE
                || rentalRepository.existsByItemIdAndStatusIn(item.getId(),
                List.of(RentalStatus.REQUESTED, RentalStatus.APPROVED,
                        RentalStatus.PAID, RentalStatus.RENTING, RentalStatus.RETURN_REQUESTED))) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 대여 신청할 수 없는 물품입니다.");
        }
        if (request.startDate() == null || request.endDate() == null
                || !request.endDate().isAfter(request.startDate())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "반납일은 대여 시작일 이후여야 합니다.");
        }
        long expectedTotal = expectedTotal(item, request);
        if (request.totalPrice() == null || request.totalPrice() != expectedTotal) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "대여 기간과 총 금액이 일치하지 않습니다.");
        }
        User borrower = userRepository.findById(borrowerId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        campusAccessPolicy.requireSameCampus(borrower, item);
        ChatRoom chatRoom = chatRoomRepository.findWithMembersById(request.chatRoomId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."));
        if (!chatRoom.getItem().getId().equals(item.getId())
                || !chatRoom.getBorrower().getId().equals(borrowerId)
                || !chatRoom.getLender().getId().equals(item.getOwner().getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "물품과 채팅방 정보가 일치하지 않습니다.");
        }
        Rental rental = rentalRepository.save(new Rental(item, borrower, item.getOwner(),
                chatRoom, request.startDate(), request.endDate(), request.totalPrice()));
        item.changeStatus(ItemStatus.REQUEST_PENDING);
        notificationService.rentalRequested(rental);
        return response(rental, borrowerId);
    }

    @Transactional(readOnly = true)
    public List<RentalResponse> getMine(Integer userId) {
        return rentalRepository.findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(userId, userId)
                .stream().map(rental -> response(rental, userId)).toList();
    }

    @Transactional(readOnly = true)
    public RentalResponse detail(Integer rentalId, Integer userId) {
        return response(findAccessible(rentalId, userId), userId);
    }

    @Transactional
    public RentalResponse reject(Integer rentalId, Integer userId) {
        Rental rental = findRentalForUpdate(rentalId);
        requireLender(rental, userId);
        requireStatus(rental, RentalStatus.REQUESTED);
        requireItemStatus(rental, ItemStatus.REQUEST_PENDING);
        rental.changeStatus(RentalStatus.REJECTED);
        rental.getItem().changeStatus(ItemStatus.AVAILABLE);
        notificationService.rentalRejected(rental);
        return response(rental, userId);
    }

    @Transactional
    public RentalResponse cancel(Integer rentalId, Integer userId) {
        Rental rental = findRentalForUpdate(rentalId);
        if (!rental.getBorrower().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "대여 신청을 취소할 권한이 없습니다.");
        }
        if (rental.getStatus() != RentalStatus.REQUESTED && rental.getStatus() != RentalStatus.APPROVED) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 상태에서는 대여를 취소할 수 없습니다.");
        }
        requireItemStatus(rental, rental.getStatus() == RentalStatus.REQUESTED
                ? ItemStatus.REQUEST_PENDING : ItemStatus.RESERVED);
        if (rental.getLenderHandedOverAt() != null || rental.getBorrowerReceivedAt() != null) {
            throw new BusinessException(HttpStatus.CONFLICT, "전달 확인이 시작된 대여는 취소할 수 없습니다.");
        }
        rental.getItem().changeStatus(ItemStatus.AVAILABLE);
        rental.changeStatus(RentalStatus.CANCELED);
        notificationService.rentalUpdated(rental, rental.getLender().getId(), "대여 신청 취소");
        return response(rental, userId);
    }

    @Transactional
    public RentalResponse approve(Integer rentalId, Integer userId) {
        Rental rental = findRentalForUpdate(rentalId);
        requireLender(rental, userId);
        requireStatus(rental, RentalStatus.REQUESTED);
        requireItemStatus(rental, ItemStatus.REQUEST_PENDING);
        rental.changeStatus(RentalStatus.APPROVED);
        rental.getItem().changeStatus(ItemStatus.RESERVED);
        notificationService.rentalApproved(rental);
        return response(rental, userId);
    }

    @Transactional
    public RentalResponse startRenting(Integer rentalId, Integer userId) {
        return confirmDelivery(rentalId, userId, true);
    }

    @Transactional
    public RentalResponse receive(Integer rentalId, Integer userId) {
        return confirmDelivery(rentalId, userId, false);
    }

    private RentalResponse confirmDelivery(Integer rentalId, Integer userId, boolean lender) {
        Rental rental = findRentalForUpdate(rentalId);
        if (lender) requireLender(rental, userId);
        else requireBorrower(rental, userId);
        requireStatus(rental, RentalStatus.APPROVED);
        requireItemStatus(rental, ItemStatus.RESERVED);
        if (lender && rental.getLenderHandedOverAt() != null
                || !lender && rental.getBorrowerReceivedAt() != null) return response(rental, userId);
        if (lender) rental.confirmHandover(clock.instant());
        else rental.confirmReceipt(clock.instant());
        if (rental.getLenderHandedOverAt() != null && rental.getBorrowerReceivedAt() != null) {
            rental.changeStatus(RentalStatus.RENTING);
            rental.getItem().changeStatus(ItemStatus.RENTED);
            notificationService.rentalStarted(rental);
        } else {
            notificationService.rentalUpdated(rental,
                    lender ? rental.getBorrower().getId() : rental.getLender().getId(),
                    lender ? "물건 전달 완료 · 수령 확인 필요" : "물품 수령 완료 · 전달 확인 필요");
        }
        return response(rental, userId);
    }

    @Transactional
    public RentalResponse requestReturn(Integer rentalId, Integer userId) {
        Rental rental = findRentalForUpdate(rentalId);
        requireBorrower(rental, userId);
        requireStatus(rental, RentalStatus.RENTING);
        requireItemStatus(rental, ItemStatus.RENTED);
        rental.changeStatus(RentalStatus.RETURN_REQUESTED);
        notificationService.rentalUpdated(rental, rental.getLender().getId(), "반납 확인 필요");
        return response(rental, userId);
    }

    @Transactional
    public RentalResponse returnItem(Integer rentalId, Integer userId) {
        Rental rental = findRentalForUpdate(rentalId);
        requireLender(rental, userId);
        requireStatus(rental, RentalStatus.RETURN_REQUESTED);
        requireItemStatus(rental, ItemStatus.RENTED);
        rental.returnItem(clock.instant());
        notificationService.rentalUpdated(rental, rental.getBorrower().getId(), "반납 확인 완료");
        rental.getItem().changeStatus(ItemStatus.AVAILABLE);
        return response(rental, userId);
    }

    private RentalResponse response(Rental rental, Integer userId) {
        return RentalResponse.from(rental, reviewService.workflow(rental, userId));
    }

    private Rental findAccessible(Integer id, Integer userId) {
        Rental rental = findRental(id);
        if (!rental.getBorrower().getId().equals(userId) && !rental.getLender().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "대여 내역에 접근할 권한이 없습니다.");
        }
        return rental;
    }

    private Rental findRental(Integer id) {
        return rentalRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "대여 내역이 존재하지 않습니다."));
    }

    private Rental findRentalForUpdate(Integer id) {
        return rentalRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "대여 내역이 존재하지 않습니다."));
    }

    private void requireLender(Rental rental, Integer userId) {
        if (!rental.getLender().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "대여 요청을 처리할 권한이 없습니다.");
        }
    }

    private void requireBorrower(Rental rental, Integer userId) {
        if (!rental.getBorrower().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "빌리는 사람만 처리할 수 있습니다.");
        }
    }

    private void requireStatus(Rental rental, RentalStatus expected) {
        if (rental.getStatus() != expected) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 대여 상태에서는 처리할 수 없습니다.");
        }
    }

    private void requireItemStatus(Rental rental, ItemStatus expected) {
        if (rental.getItem().getStatus() != expected) {
            throw new BusinessException(HttpStatus.CONFLICT,
                    "게시물과 대여 상태가 일치하지 않습니다.");
        }
    }

    private long expectedTotal(Item item, RentalCreateRequest request) {
        long seconds = Duration.between(request.startDate(), request.endDate()).getSeconds();
        long unitSeconds = switch (item.getRentalUnit()) {
            case HOUR -> 3_600L;
            case DAY -> 86_400L;
            case WEEK -> 604_800L;
            case MONTH -> 2_592_000L;
        };
        long units = Math.max(1L, (seconds + unitSeconds - 1L) / unitSeconds);
        return Math.multiplyExact(item.getRentalFee().longValue(), units);
    }

}
