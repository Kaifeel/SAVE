package com.save.notification;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FcmPushClient {
    private static final Logger log = LoggerFactory.getLogger(FcmPushClient.class);
    private final FirebaseMessaging messaging;

    public FcmPushClient(@Value("${fcm.enabled:false}") boolean enabled,
                         @Value("${fcm.credentials-path:}") String credentialsPath) {
        this.messaging = enabled ? initialize(credentialsPath) : null;
    }

    // TODO: FCM 클라이언트 테스트 지원을 위해 작성했으나 아직 미완성인 생성자입니다.
    // FcmPushClient(FirebaseMessaging messaging) { this.messaging = messaging; }
    public boolean enabled() { return messaging != null; }

    public void send(String token, String title, String body, Map<String, Object> data) {
        if (!enabled()) return;
        Message.Builder builder = Message.builder().setToken(token)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build());
        data.forEach((key, value) -> { if (value != null) builder.putData(key, String.valueOf(value)); });
        try { messaging.send(builder.build()); }
        catch (Exception exception) { throw new IllegalStateException("FCM push delivery failed", exception); }
    }

    private FirebaseMessaging initialize(String path) {
        if (path == null || path.isBlank()) throw new IllegalStateException("FCM_CREDENTIALS_PATH is required when FCM is enabled");
        try (FileInputStream input = new FileInputStream(path)) {
            FirebaseOptions options = FirebaseOptions.builder().setCredentials(GoogleCredentials.fromStream(input)).build();
            FirebaseApp app = FirebaseApp.getApps().stream().filter(it -> "save-fcm".equals(it.getName())).findFirst()
                    .orElseGet(() -> FirebaseApp.initializeApp(options, "save-fcm"));
            return FirebaseMessaging.getInstance(app);
        } catch (IOException exception) { throw new IllegalStateException("Unable to load FCM credentials", exception); }
    }
}
