package com.save.chat.controller;

import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.dto.ChatMessageSendRequest;
import com.save.chat.service.ChatMessageService;
import com.save.chat.service.ChatRealtimePublisher;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chats/rooms/{roomId}")
public class ChatMessageController {
    private final ChatMessageService service;
    private final ChatRealtimePublisher realtimePublisher;

    public ChatMessageController(ChatMessageService service, ChatRealtimePublisher realtimePublisher) {
        this.service = service; this.realtimePublisher = realtimePublisher;
    }

    @PostMapping("/messages")
    public ChatMessageResponse send(@PathVariable Integer roomId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChatMessageSendRequest request) {
        ChatMessageResponse response = service.send(roomId, userId(jwt), request.message());
        realtimePublisher.publishMessage(roomId, response);
        return response;
    }

    @GetMapping("/messages")
    public List<ChatMessageResponse> messages(@PathVariable Integer roomId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "50") int size) {
        return service.getMessages(roomId, userId(jwt), size);
    }

    @PatchMapping("/read")
    public Map<String, Integer> read(@PathVariable Integer roomId,
            @AuthenticationPrincipal Jwt jwt) {
        int readCount = service.markAsRead(roomId, userId(jwt));
        realtimePublisher.publishChatList(roomId);
        return Map.of("readCount", readCount);
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
