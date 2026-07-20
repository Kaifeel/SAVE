package com.save.chat.service;

import com.save.chat.domain.ChatMessage;
import com.save.chat.domain.ChatRoom;
import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.repository.ChatMessageRepository;
import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.notification.ChatMessageCreatedEvent;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatMessageService {
    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ChatMessageService(ChatRoomRepository roomRepository, ChatMessageRepository messageRepository,
                              UserRepository userRepository, ApplicationEventPublisher eventPublisher) {
        this.roomRepository = roomRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ChatMessageResponse send(Integer roomId, Integer userId, String rawContent) {
        ChatRoom room = getAccessibleRoom(roomId, userId);
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isEmpty() || content.length() > 2000) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "메시지는 1자 이상 2000자 이하여야 합니다.");
        }
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        ChatMessage saved = messageRepository.save(new ChatMessage(room, sender, content));
        Integer receiverId = room.getBorrower().getId().equals(userId)
                ? room.getLender().getId() : room.getBorrower().getId();
        eventPublisher.publishEvent(new ChatMessageCreatedEvent(saved.getId(), roomId, receiverId,
                sender.getName(), content));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(Integer roomId, Integer userId, int size) {
        getAccessibleRoom(roomId, userId);
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<ChatMessage> messages = new ArrayList<>(messageRepository
                .findByChatRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(0, safeSize)));
        Collections.reverse(messages);
        return messages.stream().map(this::toResponse).toList();
    }

    @Transactional
    public int markAsRead(Integer roomId, Integer userId) {
        getAccessibleRoom(roomId, userId);
        return messageRepository.markAsRead(roomId, userId);
    }

    ChatRoom getAccessibleRoom(Integer roomId, Integer userId) {
        ChatRoom room = roomRepository.findWithMembersById(roomId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."));
        if (!room.getBorrower().getId().equals(userId) && !room.getLender().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "채팅방에 접근할 권한이 없습니다.");
        }
        return room;
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatMessageResponse(message.getId(), message.getChatRoom().getId(),
                message.getSender().getId(), message.getSender().getName(), message.getContent(),
                message.getCreatedAt(), message.isRead());
    }
}
