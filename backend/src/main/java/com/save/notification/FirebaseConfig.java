package com.save.notification;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.*;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.FileInputStream;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;

@Configuration
@ConditionalOnProperty(prefix = "firebase", name = "enabled", havingValue = "true")
public class FirebaseConfig {
    @Bean
    FirebaseApp firebaseApp(@Value("${firebase.credentials-path}") String credentialsPath) throws IOException {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            throw new IllegalStateException("FIREBASE_CREDENTIALS_PATH 환경변수가 필요합니다.");
        }
        try (FileInputStream input = new FileInputStream(credentialsPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(input)).build();
            return FirebaseApp.getApps().isEmpty()
                    ? FirebaseApp.initializeApp(options) : FirebaseApp.getInstance();
        }
    }

    @Bean
    FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }
}
