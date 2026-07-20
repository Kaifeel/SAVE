package com.save.report;

import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.user.User;
import com.save.user.UserRepository;
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

    public ReportService(ReportRepository reportRepository, UserRepository userRepository,
                         ItemRepository itemRepository, ChatRoomRepository chatRoomRepository) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.chatRoomRepository = chatRoomRepository;
    }

    @Transactional
    public ReportResponse create(Integer reporterId, ReportCreateRequest request) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        if (request.itemId() != null && !itemRepository.existsById(request.itemId())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "신고할 물품이 존재하지 않습니다.");
        }
        if (request.reportedUserId() != null && !userRepository.existsById(request.reportedUserId())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "신고할 사용자가 존재하지 않습니다.");
        }
        if (request.chatRoomId() != null && !chatRoomRepository.existsById(request.chatRoomId())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "신고할 채팅방이 존재하지 않습니다.");
        }
        return ReportResponse.from(reportRepository.save(new Report(reporter, request.reportedUserId(),
                request.itemId(), request.chatRoomId(), request.reason().trim())));
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
