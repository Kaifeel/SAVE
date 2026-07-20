package com.save.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageSendRequest(
        @NotBlank(message = "메시지를 입력해 주세요.")
        @Size(max = 2000, message = "메시지는 2000자 이하여야 합니다.")
        String content
) {}
