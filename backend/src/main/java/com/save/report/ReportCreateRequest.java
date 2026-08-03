package com.save.report;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportCreateRequest(Integer reportedUserId, Integer itemId, Integer chatRoomId,
                                  @NotBlank @Size(min = 10, max = 1000) String reason) {
    @AssertTrue(message = "신고 대상 사용자, 물품 또는 채팅방 중 하나는 필요합니다.")
    public boolean isTargetPresent() {
        return reportedUserId != null || itemId != null || chatRoomId != null;
    }

    @AssertTrue(message = "신고 사유는 공백을 제외하고 10자 이상이어야 합니다.")
    public boolean isDetailedReasonValid() {
        return reason == null || reason.trim().length() >= 10;
    }
}
