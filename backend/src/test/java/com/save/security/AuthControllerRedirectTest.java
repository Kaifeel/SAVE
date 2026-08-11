package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.save.common.BusinessException;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class AuthControllerRedirectTest {

    @Test
    void redirectsWithOneTimeCodeAfterGoogleCredentialIsVerified() {
        AuthService authService = mock(AuthService.class);
        GoogleOAuthService googleOAuthService = mock(GoogleOAuthService.class);
        GoogleLoginTicketService ticketService = mock(GoogleLoginTicketService.class);
        AuthSessionService authSessionService = mock(AuthSessionService.class);
        RefreshCookieService refreshCookieService = mock(RefreshCookieService.class);
        AuthOriginValidator authOriginValidator = mock(AuthOriginValidator.class);
        AuthController controller = new AuthController(authService, googleOAuthService,
                ticketService, authSessionService, refreshCookieService, authOriginValidator,
                "http://localhost:5173");
        AuthResponse auth = new AuthResponse("save-jwt", "Bearer", false, null);
        when(googleOAuthService.login("google-id-token")).thenReturn(auth);
        when(ticketService.issue(auth)).thenReturn("one-time-code");

        ResponseEntity<Void> response = controller.googleRedirect(
                "google-id-token", "csrf-value", "csrf-value");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SEE_OTHER);
        assertThat(response.getHeaders().getLocation()).isEqualTo(
                URI.create("http://localhost:5173#google_login_code=one-time-code"));
    }

    @Test
    void rejectsRedirectWhenCsrfCookieDoesNotMatchRequest() {
        AuthService authService = mock(AuthService.class);
        GoogleOAuthService googleOAuthService = mock(GoogleOAuthService.class);
        GoogleLoginTicketService ticketService = mock(GoogleLoginTicketService.class);
        AuthSessionService authSessionService = mock(AuthSessionService.class);
        RefreshCookieService refreshCookieService = mock(RefreshCookieService.class);
        AuthOriginValidator authOriginValidator = mock(AuthOriginValidator.class);
        AuthController controller = new AuthController(authService, googleOAuthService,
                ticketService, authSessionService, refreshCookieService, authOriginValidator,
                "http://localhost:5173");

        assertThatThrownBy(() -> controller.googleRedirect(
                "google-id-token", "request-token", "different-cookie"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Google 로그인 CSRF 검증에 실패했습니다.");
        verifyNoInteractions(googleOAuthService, ticketService);
    }
}
