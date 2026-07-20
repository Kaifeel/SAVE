package com.save.chat.controller;

import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.dto.ChatMessageSendRequest;
import com.save.chat.service.ChatMessageService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {
    private final ChatMessageService service;
    private final SimpMessagingTemplate messagingTemplate;
    public ChatWebSocketController(ChatMessageService service, SimpMessagingTemplate messagingTemplate) {
        this.service = service; this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chats/rooms/{roomId}/messages")
    public void send(@DestinationVariable Integer roomId,
            Principal principal, ChatMessageSendRequest request) {
        Integer userId = Integer.valueOf(principal.getName());
        ChatMessageResponse response = service.send(roomId, userId, request.content());
        messagingTemplate.convertAndSend("/topic/chats/rooms/" + roomId, response);
    }
}
