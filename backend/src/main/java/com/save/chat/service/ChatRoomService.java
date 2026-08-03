package com.save.chat.service;

import com.save.chat.domain.ChatMessage;
import com.save.chat.domain.ChatRoom;
import com.save.chat.dto.ChatRoomCreateResponse;
import com.save.chat.dto.ChatRoomListResponse;
import com.save.chat.repository.ChatMessageRepository;
import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatRoomService {
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;

    public ChatRoomService(ItemRepository itemRepository, UserRepository userRepository,
                           ChatRoomRepository chatRoomRepository,
                           ChatMessageRepository chatMessageRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    @Transactional
    public ChatRoomCreateResponse createOrGetRoom(Integer itemId, Integer loginUserId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));

        Integer lenderId = item.getOwner().getId();
        Integer borrowerId = loginUserId;

        if (lenderId.equals(borrowerId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인 물품에는 채팅할 수 없습니다.");
        }
        if (!userRepository.existsById(borrowerId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다.");
        }

        return chatRoomRepository.findByItemIdAndBorrowerIdAndLenderId(itemId, borrowerId, lenderId)
                .map(this::toResponse)
                .orElseGet(() -> {
                    User borrower = userRepository.getReferenceById(borrowerId);
                    User lender = userRepository.getReferenceById(lenderId);
                    return toResponse(chatRoomRepository.save(new ChatRoom(item, borrower, lender)));
                });
    }

    @Transactional(readOnly = true)
    public List<ChatRoomListResponse> getMyRooms(Integer loginUserId) {
        return chatRoomRepository.findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(loginUserId, loginUserId)
                .stream().map(room -> toListResponse(room, loginUserId)).toList();
    }

    @Transactional(readOnly = true)
    public void assertParticipant(Integer roomId, Integer userId) {
        ChatRoom room = chatRoomRepository.findWithMembersById(roomId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."));
        if (!room.getBorrower().getId().equals(userId)
                && !room.getLender().getId().equals(userId)) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN, "채팅방에 접근할 권한이 없습니다.");
        }
    }

    @Transactional(readOnly = true)
    public Map<Integer, ChatRoomListResponse> getParticipantSummaries(Integer roomId) {
        ChatRoom room = chatRoomRepository.findWithMembersById(roomId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "채팅방이 존재하지 않습니다."));
        Map<Integer, ChatRoomListResponse> summaries = new LinkedHashMap<>();
        summaries.put(room.getBorrower().getId(), toListResponse(room, room.getBorrower().getId()));
        summaries.put(room.getLender().getId(), toListResponse(room, room.getLender().getId()));
        return summaries;
    }

    private ChatRoomListResponse toListResponse(ChatRoom room, Integer userId) {
        User opponent = room.getBorrower().getId().equals(userId) ? room.getLender() : room.getBorrower();
        ChatMessage last = chatMessageRepository.findFirstByChatRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null);
        return new ChatRoomListResponse(room.getId(), room.getItem().getId(), room.getItem().getTitle(),
                opponent.getId(), opponent.getName(), last == null ? null : last.getContent(),
                last == null ? null : last.getCreatedAt(),
                chatMessageRepository.countByChatRoomIdAndSenderIdNotAndReadFalse(room.getId(), userId));
    }

    private ChatRoomCreateResponse toResponse(ChatRoom room) {
        Item item = room.getItem();
        return new ChatRoomCreateResponse(room.getId(), new ChatRoomCreateResponse.ItemSummary(
                item.getId(), item.getTitle(), item.getRentalFee(), item.getRentalUnit().name(),
                item.getStatus().name()), room.getBorrower().getId(), room.getLender().getId(),
                room.getCreatedAt());
    }
}
