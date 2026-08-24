package com.save.report;

import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.security.CampusAccessPolicy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final CampusAccessPolicy campusAccessPolicy;

    public ReportService(ReportRepository reportRepository, UserRepository userRepository,
                         ItemRepository itemRepository, ChatRoomRepository chatRoomRepository,
                         CampusAccessPolicy campusAccessPolicy) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.campusAccessPolicy = campusAccessPolicy;
    }

    @Transactional
    public ReportResponse create(Integer reporterId, ReportCreateRequest request) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        Item item = request.itemId() == null ? null : itemRepository.findById(request.itemId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "신고할 물품이 존재하지 않습니다."));
        User reportedUser = request.reportedUserId() == null ? null
                : userRepository.findById(request.reportedUserId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "신고할 사용자가 존재하지 않습니다."));
        ChatRoom chatRoom = request.chatRoomId() == null ? null
                : chatRoomRepository.findWithMembersById(request.chatRoomId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "신고할 채팅방이 존재하지 않습니다."));
        validateTargets(reporter, reportedUser, item, chatRoom);
        return ReportResponse.from(reportRepository.save(new Report(reporter, reportedUser,
                item, chatRoom, request.reason().trim())));
    }

    private void validateTargets(User reporter, User reportedUser, Item item, ChatRoom chatRoom) {
        if (reportedUser != null && reportedUser.getId().equals(reporter.getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인을 신고할 수 없습니다.");
        }
        if (reportedUser != null) campusAccessPolicy.requireSameCampus(reporter, reportedUser);
        if (item != null) {
            campusAccessPolicy.requireSameCampus(reporter, item);
            if (chatRoom == null && item.getOwner().getId().equals(reporter.getId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST,
                        "본인의 물품을 신고할 수 없습니다.");
            }
            if (chatRoom == null && reportedUser != null
                    && !item.getOwner().getId().equals(reportedUser.getId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST,
                        "신고 대상 사용자와 물품 정보가 일치하지 않습니다.");
            }
        }
        if (chatRoom == null) return;

        boolean reporterIsBorrower = chatRoom.getBorrower().getId().equals(reporter.getId());
        boolean reporterIsLender = chatRoom.getLender().getId().equals(reporter.getId());
        if (!reporterIsBorrower && !reporterIsLender) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "참여한 채팅방만 신고할 수 있습니다.");
        }
        User opponent = reporterIsBorrower ? chatRoom.getLender() : chatRoom.getBorrower();
        if (reportedUser != null && !opponent.getId().equals(reportedUser.getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "신고 대상 사용자가 채팅 상대방과 일치하지 않습니다.");
        }
        if (item != null && !chatRoom.getItem().getId().equals(item.getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "신고 대상 물품과 채팅방 정보가 일치하지 않습니다.");
        }
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> list() {
        return reportRepository.findAllByOrderByCreatedAtDesc().stream().map(ReportResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ReportResponse detail(Integer reportId) { return ReportResponse.from(findReport(reportId)); }

    @Transactional
    public ReportResponse changeStatus(Integer reportId, String rawStatus) {
        Report report = findReport(reportId);
        try {
            report.changeStatus(ReportStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT)));
            return ReportResponse.from(report);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "지원하지 않는 신고 상태입니다.");
        }
    }

    @Transactional
    public void deleteItem(Integer itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        item.markDeleted();
    }

    @Transactional
    public UserSanctionResponse sanctionUser(Integer userId, UserSanctionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        user.sanction(LocalDateTime.now().plusDays(7), request.reason().trim());
        return new UserSanctionResponse(user.getId(), user.getStatus().name(),
                user.getSanctionReason(), LocalDateTime.now());
    }

    private Report findReport(Integer reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "신고 내역이 존재하지 않습니다."));
    }
}
