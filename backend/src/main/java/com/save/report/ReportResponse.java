package com.save.report;

import java.time.LocalDateTime;

public record ReportResponse(Integer id, Integer reporterId, String reporterName,
                             String targetType, Integer targetId, Integer itemId,
                             String reason, String status, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(report.getId(), report.getReporter().getId(),
                report.getReporter().getName(), report.getTargetType(), report.getTargetId(),
                report.getItemId(), report.getReason(), report.getStatus().name().toLowerCase(),
                report.getCreatedAt(), report.getUpdatedAt());
    }
}
