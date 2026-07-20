package com.save.chat.controller;

import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.dto.ChatMessageSendRequest;
import com.save.chat.service.ChatMessageService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chats/rooms/{roomId}")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatMessageController {
    private final ChatMessageService service;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageController(ChatMessageService service, SimpMessagingTemplate messagingTemplate) {
        this.service = service; this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/messages")
    public ChatMessageResponse send(@PathVariable Integer roomId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChatMessageSendRequest request) {
        ChatMessageResponse response = service.send(roomId, userId(jwt), request.message());
        messagingTemplate.convertAndSend("/topic/chats/rooms/" + roomId, response);
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
        return Map.of("readCount", service.markAsRead(roomId, userId(jwt)));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
