package com.save.chat.controller;

import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.dto.ChatMessageSendRequest;
import com.save.chat.service.ChatMessageService;
import com.save.chat.service.ChatRealtimePublisher;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {
    private final ChatMessageService service;
    private final ChatRealtimePublisher realtimePublisher;
    public ChatWebSocketController(ChatMessageService service, ChatRealtimePublisher realtimePublisher) {
        this.service = service; this.realtimePublisher = realtimePublisher;
    }

    @MessageMapping("/chats/rooms/{roomId}/messages")
    public void send(@DestinationVariable Integer roomId,
            Principal principal, ChatMessageSendRequest request) {
        Integer userId = Integer.valueOf(principal.getName());
        ChatMessageResponse response = service.send(roomId, userId, request.message());
        realtimePublisher.publishMessage(roomId, response);
    }
}
