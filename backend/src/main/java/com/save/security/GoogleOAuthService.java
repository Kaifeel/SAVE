package com.save.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleOAuthService {
    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final PknuEmailPolicy emailPolicy;
    private final List<String> clientIds;

    public GoogleOAuthService(UserRepository userRepository, JwtTokenService jwtTokenService,
                              PknuEmailPolicy emailPolicy,
                              @Value("${google.oauth.client-ids:}") String clientIds) {
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
        this.emailPolicy = emailPolicy;
        this.clientIds = parseClientIds(clientIds);
    }

    static List<String> parseClientIds(String configured) {
        if (configured == null) return List.of();
        return Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(clientId -> !clientId.isEmpty())
                .distinct()
                .toList();
    }

    @Transactional
    public AuthResponse login(String tokenValue) {
        if (clientIds.isEmpty()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Google OAuth 클라이언트 ID가 설정되지 않았습니다.");
        }
        GoogleIdToken.Payload payload = verify(tokenValue);
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "인증되지 않은 Google 이메일입니다.");
        }
        String subject = payload.getSubject();
        String email = emailPolicy.requireAllowed(payload.getEmail(), HttpStatus.UNAUTHORIZED);
        String name = stringClaim(payload, "name", email.substring(0, email.indexOf('@')));
        String picture = stringClaim(payload, "picture", null);

        User existing = userRepository.findByOauthProviderAndOauthId("GOOGLE", subject).orElse(null);
        boolean isNewUser = existing == null;
        User user;
        if (existing != null) {
            user = existing;
        } else {
            user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) {
                user = new User(email, name, null, picture, "GOOGLE", subject);
            } else {
                user.linkGoogleAccount(subject, picture);
                isNewUser = false;
            }
            user = userRepository.save(user);
        }
        return new AuthResponse(jwtTokenService.issue(user), "Bearer", isNewUser,
                AuthUserResponse.from(user));
    }

    private GoogleIdToken.Payload verify(String tokenValue) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(clientIds)
                    .build();
            GoogleIdToken token = verifier.verify(tokenValue);
            if (token == null) throw invalidToken();
            return token.getPayload();
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw invalidToken();
        }
    }

    private String stringClaim(GoogleIdToken.Payload payload, String key, String fallback) {
        Object value = payload.get(key);
        return value instanceof String text && !text.isBlank() ? text : fallback;
    }

    private BusinessException invalidToken() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "유효하지 않은 Google ID 토큰입니다.");
    }
}
