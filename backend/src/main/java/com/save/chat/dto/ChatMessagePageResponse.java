package com.save.chat.dto;

import java.util.List;

public record ChatMessagePageResponse(
        List<ChatMessageResponse> messages,
        Integer nextBefore,
        boolean hasMore
) {}
