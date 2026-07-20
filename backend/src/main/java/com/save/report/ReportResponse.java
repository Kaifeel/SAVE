package com.save.report;

import java.time.LocalDateTime;

public record ReportResponse(Integer id, Integer reporterId, Integer reportedUserId,
                             Integer itemId, Integer chatRoomId, String reason,
                             String status, LocalDateTime createdAt,
                             LocalDateTime handledAt) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(report.getId(), report.getReporter().getId(),
                report.getReportedUserId(), report.getItemId(), report.getChatRoomId(),
                report.getReason(), report.getStatus().name(), report.getCreatedAt(),
                report.getHandledAt());
    }
}
