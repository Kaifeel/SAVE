package com.save.notification;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class PushTransactionBoundaryIntegrationTest {
    @Autowired ApplicationEventPublisher eventPublisher;
    @Autowired PlatformTransactionManager transactionManager;
    @MockBean PushNotificationService pushService;

    @BeforeEach
    void setUp() {
        reset(pushService);
    }

    @Test
    void rollbackDoesNotSendPush() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        transaction.executeWithoutResult(status -> {
            eventPublisher.publishEvent(event());
            status.setRollbackOnly();
        });

        verify(pushService, after(300).never()).sendChatMessage(event());
    }

    @Test
    void providerFailureCannotChangeTheAlreadyCommittedResult() {
        doThrow(new IllegalStateException("Expo unavailable"))
                .when(pushService).sendChatMessage(event());
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        assertThatCode(() -> transaction.execute(status -> {
            eventPublisher.publishEvent(event());
            return "committed";
        })).doesNotThrowAnyException();

        verify(pushService, org.mockito.Mockito.timeout(1000)).sendChatMessage(event());
    }

    private ChatMessageCreatedEvent event() {
        return new ChatMessageCreatedEvent(31, 7, 9, "김상대", "내용");
    }
}
