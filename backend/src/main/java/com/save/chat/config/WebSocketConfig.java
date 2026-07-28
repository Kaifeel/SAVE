package com.save.chat.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthorizationInterceptor authorizationInterceptor;
    private final List<String> allowedOrigins;

    public WebSocketConfig(WebSocketAuthorizationInterceptor authorizationInterceptor,
                           @Value("${security.cors.allowed-origins}") String configuredOrigins) {
        this.authorizationInterceptor = authorizationInterceptor;
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isBlank()).toList();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authorizationInterceptor);
    }
}
