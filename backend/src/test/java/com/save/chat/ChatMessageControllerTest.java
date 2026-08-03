package com.save.chat;

import com.save.chat.controller.ChatMessageController;
import com.save.chat.service.ChatMessageService;
import com.save.chat.service.ChatRealtimePublisher;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatMessageControllerTest {

    @Test
    void republishesThePersonalChatListAfterMarkingMessagesRead() {
        ChatMessageService service = mock(ChatMessageService.class);
        ChatRealtimePublisher realtimePublisher = mock(ChatRealtimePublisher.class);
        ChatMessageController controller = new ChatMessageController(service, realtimePublisher);
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("7");
        when(service.markAsRead(3, 7)).thenReturn(2);

        Map<String, Integer> response = controller.read(3, jwt);

        assertEquals(2, response.get("readCount"));
        verify(realtimePublisher).publishChatList(3);
    }
}
