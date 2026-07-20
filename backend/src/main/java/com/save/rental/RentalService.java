package com.save.rental;

import com.save.common.BusinessException;
import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RentalService {
    private final RentalRepository rentalRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;

    public RentalService(RentalRepository rentalRepository, ItemRepository itemRepository,
                         UserRepository userRepository, ChatRoomRepository chatRoomRepository) {
        this.rentalRepository = rentalRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.chatRoomRepository = chatRoomRepository;
    }

    @Transactional
    public RentalResponse create(Integer borrowerId, RentalCreateRequest request) {
        Item item = itemRepository.findById(request.itemId())
                .filter(value -> value.getStatus() != ItemStatus.DELETED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        if (item.getUser().getId().equals(borrowerId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인 물품은 대여 신청할 수 없습니다.");
        }
        if (item.getStatus() != ItemStatus.AVAILABLE
                || rentalRepository.existsByItemIdAndStatusIn(item.getId(),
                List.of(RentalStatus.REQUESTED, RentalStatus.APPROVED))) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 대여 신청할 수 없는 물품입니다.");
        }
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "반납일은 대여 시작일보다 빠를 수 없습니다.");
        }
        User borrower = userRepository.findById(borrowerId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        ChatRoom chatRoom = chatRoomRepository.findWithMembersById(request.chatRoomId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."));
        if (!chatRoom.getItem().getId().equals(item.getId())
                || !chatRoom.getBorrower().getId().equals(borrowerId)
                || !chatRoom.getLender().getId().equals(item.getUser().getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "물품과 채팅방 정보가 일치하지 않습니다.");
        }
        return RentalResponse.from(rentalRepository.save(new Rental(item, borrower, item.getUser(),
                chatRoom, request.startDate(), request.endDate(), request.totalPrice())));
    }

    @Transactional(readOnly = true)
    public List<RentalResponse> getMine(Integer userId) {
        return rentalRepository.findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(userId, userId)
                .stream().map(RentalResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RentalResponse detail(Integer rentalId, Integer userId) {
        return RentalResponse.from(findAccessible(rentalId, userId));
    }

    @Transactional
    public RentalResponse approve(Integer rentalId, Integer userId) {
        Rental rental = findRental(rentalId);
        requireLender(rental, userId);
        requireStatus(rental, RentalStatus.REQUESTED);
        rental.changeStatus(RentalStatus.APPROVED);
        rental.getItem().changeStatus(ItemStatus.RESERVED);
        return RentalResponse.from(rental);
    }

    @Transactional
    public RentalResponse reject(Integer rentalId, Integer userId) {
        Rental rental = findRental(rentalId);
        requireLender(rental, userId);
        requireStatus(rental, RentalStatus.REQUESTED);
        rental.changeStatus(RentalStatus.REJECTED);
        return RentalResponse.from(rental);
    }

    @Transactional
    public RentalResponse cancel(Integer rentalId, Integer userId) {
        Rental rental = findRental(rentalId);
        if (!rental.getBorrower().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "대여 신청을 취소할 권한이 없습니다.");
        }
        if (rental.getStatus() != RentalStatus.REQUESTED && rental.getStatus() != RentalStatus.APPROVED) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 상태에서는 대여를 취소할 수 없습니다.");
        }
        if (rental.getStatus() == RentalStatus.APPROVED) rental.getItem().changeStatus(ItemStatus.AVAILABLE);
        rental.changeStatus(RentalStatus.CANCELLED);
        return RentalResponse.from(rental);
    }

    @Transactional
    public RentalResponse returnItem(Integer rentalId, Integer userId) {
        Rental rental = findRental(rentalId);
        if (!rental.getBorrower().getId().equals(userId) && !rental.getLender().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "반납 처리 권한이 없습니다.");
        }
        requireStatus(rental, RentalStatus.APPROVED);
        rental.changeStatus(RentalStatus.RETURNED);
        rental.getItem().changeStatus(ItemStatus.AVAILABLE);
        return RentalResponse.from(rental);
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

    private void requireLender(Rental rental, Integer userId) {
        if (!rental.getLender().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "대여 요청을 처리할 권한이 없습니다.");
        }
    }

    private void requireStatus(Rental rental, RentalStatus expected) {
        if (rental.getStatus() != expected) {
            throw new BusinessException(HttpStatus.CONFLICT, "현재 대여 상태에서는 처리할 수 없습니다.");
        }
    }

}
