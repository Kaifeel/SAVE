package com.save.report;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportCreateRequest(Integer reportedUserId, Integer itemId, Integer chatRoomId,
                                  @NotBlank @Size(max = 1000) String reason) {
    @AssertTrue(message = "신고 대상 사용자, 물품 또는 채팅방 중 하나는 필요합니다.")
    public boolean hasTarget() {
        return reportedUserId != null || itemId != null || chatRoomId != null;
    }
}
