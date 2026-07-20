package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatRoomCreateResponse(
        Integer roomId,
        Integer itemId,
        String itemTitle,
        Integer borrowerId,
        String borrowerName,
        Integer lenderId,
        String lenderName,
        LocalDateTime createdAt
) {}
