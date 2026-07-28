package com.save.chat;

import com.save.chat.config.WebSocketAuthorizationInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebSocketSecurityIntegrationTest {

    @Test
    void connectWithoutJwtIsRejected() {
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, null);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Authorization");
    }
}
