package com.save.chat.controller;

import com.save.chat.dto.ChatRoomCreateRequest;
import com.save.chat.dto.ChatRoomCreateResponse;
import com.save.chat.dto.ChatRoomListResponse;
import com.save.chat.service.ChatRoomService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chats/rooms")
public class ChatRoomController {
    private final ChatRoomService chatRoomService;
    public ChatRoomController(ChatRoomService chatRoomService) { this.chatRoomService = chatRoomService; }

    @PostMapping
    public ResponseEntity<ChatRoomCreateResponse> createOrGetRoom(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChatRoomCreateRequest request) {
        return ResponseEntity.ok(chatRoomService.createOrGetRoom(request.itemId(), userId(jwt)));
    }

    @GetMapping
    public List<ChatRoomListResponse> getMyRooms(@AuthenticationPrincipal Jwt jwt) {
        return chatRoomService.getMyRooms(userId(jwt));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
