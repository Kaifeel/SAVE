package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatRoomCreateResponse(
        Integer chatRoomId,
        ItemSummary item,
        Integer borrowerId,
        Integer lenderId,
        LocalDateTime createdAt) {
    public record ItemSummary(Integer id, String title, Integer price,
                              String priceUnit, String status) {}
}
