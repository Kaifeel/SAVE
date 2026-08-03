package com.save.report;

import java.time.LocalDateTime;

public record ReportResponse(Integer id, Integer reporterId, String reporterName,
                             Integer reportedUserId, String reportedUserName,
                             Integer itemId, String itemTitle, Integer chatRoomId, String reason,
                             String status, LocalDateTime createdAt,
                             LocalDateTime handledAt) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(report.getId(), report.getReporter().getId(),
                report.getReporterName(), report.getReportedUserId(), report.getReportedUserName(),
                report.getItemId(), report.getItemTitle(), report.getChatRoomId(), report.getReason(),
                report.getStatus().name(), report.getCreatedAt(), report.getHandledAt());
    }
}
