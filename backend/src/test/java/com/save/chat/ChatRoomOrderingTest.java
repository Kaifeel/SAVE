package com.save.chat;

import com.save.chat.domain.ChatMessage;
import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatMessageRepository;
import com.save.chat.repository.ChatRoomRepository;
import com.save.chat.service.ChatRoomService;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.security.CampusAccessPolicy;
import com.save.user.User;
import com.save.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatRoomOrderingTest {
    @Test
    void ordersByLatestMessageWithCreationFallbackAndIdTieBreak() {
        var rooms = mock(ChatRoomRepository.class);
        var messages = mock(ChatMessageRepository.class);
        var service = new ChatRoomService(mock(ItemRepository.class), mock(UserRepository.class),
                rooms, messages, mock(CampusAccessPolicy.class));
        var base = LocalDateTime.of(2026, 9, 12, 12, 0);
        var borrower = mock(User.class);
        var lender = mock(User.class);
        var item = mock(Item.class);
        when(borrower.getId()).thenReturn(1);
        when(lender.getId()).thenReturn(2);
        ChatRoom[] values = new ChatRoom[3];
        for (int i = 0; i < 3; i++) {
            var room = mock(ChatRoom.class);
            values[i] = room;
            when(room.getId()).thenReturn(i + 1);
            when(room.getBorrower()).thenReturn(borrower);
            when(room.getLender()).thenReturn(lender);
            when(room.getItem()).thenReturn(item);
            when(room.getCreatedAt()).thenReturn(base.plusHours(i));
            when(messages.findFirstByChatRoomIdOrderByCreatedAtDesc(i + 1))
                    .thenReturn(Optional.empty());
        }
        var message = mock(ChatMessage.class);
        when(message.getCreatedAt()).thenReturn(base.plusHours(2));
        when(messages.findFirstByChatRoomIdOrderByCreatedAtDesc(1))
                .thenReturn(Optional.of(message));
        when(rooms.findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(1, 1))
                .thenReturn(List.of(values[2], values[1], values[0]));

        assertEquals(List.of(3, 1, 2),
                service.getMyRooms(1).stream().map(r -> r.chatRoomId()).toList());

        when(message.getCreatedAt()).thenReturn(base.plusHours(3));
        assertEquals(List.of(1, 3, 2),
                service.getMyRooms(1).stream().map(r -> r.chatRoomId()).toList());
    }
}
