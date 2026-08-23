package com.save.security;

import com.save.common.BusinessException;
import jakarta.validation.Valid;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final GoogleOAuthService googleOAuthService;
    private final GoogleLoginTicketService googleLoginTicketService;
    private final AuthSessionService authSessionService;
    private final RefreshCookieService refreshCookieService;
    private final AuthOriginValidator authOriginValidator;
    private final String googleRedirectSuccessUri;

    public AuthController(AuthService authService, GoogleOAuthService googleOAuthService,
                          GoogleLoginTicketService googleLoginTicketService,
                          AuthSessionService authSessionService,
                          RefreshCookieService refreshCookieService,
                          AuthOriginValidator authOriginValidator,
                          @Value("${google.oauth.redirect-success-uri:http://localhost:5173}")
                          String googleRedirectSuccessUri) {
        this.authService = authService;
        this.googleOAuthService = googleOAuthService;
        this.googleLoginTicketService = googleLoginTicketService;
        this.authSessionService = authSessionService;
        this.refreshCookieService = refreshCookieService;
        this.authOriginValidator = authOriginValidator;
        this.googleRedirectSuccessUri = googleRedirectSuccessUri;
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest request,
                               HttpServletResponse servletResponse) {
        return startSession(googleOAuthService.login(request.idToken()), servletResponse);
    }

    @PostMapping(value = "/google/redirect",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> googleRedirect(
            @RequestParam String credential,
            @RequestParam(name = "g_csrf_token") String requestCsrfToken,
            @CookieValue(name = "g_csrf_token", required = false) String cookieCsrfToken) {
        requireMatchingCsrfToken(requestCsrfToken, cookieCsrfToken);
        if (credential == null || credential.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "Google ID 토큰이 필요합니다.");
        }

        AuthResponse authResponse = googleOAuthService.login(credential);
        String code = googleLoginTicketService.issue(authResponse);
        URI location = UriComponentsBuilder.fromUriString(googleRedirectSuccessUri)
                .fragment("google_login_code={code}")
                .buildAndExpand(code)
                .toUri();
        return ResponseEntity.status(HttpStatus.SEE_OTHER).location(location).build();
    }

    @PostMapping("/google/exchange")
    public AuthResponse exchangeGoogleLogin(
            @Valid @RequestBody GoogleLoginCodeRequest request,
            HttpServletResponse servletResponse) {
        return startSession(googleLoginTicketService.consume(request.code()), servletResponse);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signUp(@Valid @RequestBody SignUpRequest request,
                               HttpServletResponse servletResponse) {
        return startSession(authService.signUp(request), servletResponse);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletResponse servletResponse) {
        return startSession(authService.login(request), servletResponse);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        authOriginValidator.requireAllowed(origin);
        preventCaching(servletResponse);
        try {
            AuthSession session = authSessionService.refresh(
                    refreshCookieService.read(servletRequest));
            refreshCookieService.write(
                    servletResponse, session.refreshToken(), session.expiresAt());
            return session.response();
        } catch (BusinessException exception) {
            refreshCookieService.clear(servletResponse);
            throw exception;
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        authOriginValidator.requireAllowed(origin);
        preventCaching(servletResponse);
        authSessionService.logout(refreshCookieService.read(servletRequest));
        refreshCookieService.clear(servletResponse);
    }

    private AuthResponse startSession(AuthResponse response,
                                      HttpServletResponse servletResponse) {
        preventCaching(servletResponse);
        AuthSession session = authSessionService.start(response);
        refreshCookieService.write(servletResponse, session.refreshToken(), session.expiresAt());
        return session.response();
    }

    private void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
    }

    private void requireMatchingCsrfToken(String requestToken, String cookieToken) {
        if (requestToken == null || requestToken.isBlank()
                || cookieToken == null || cookieToken.isBlank()
                || !MessageDigest.isEqual(
                        requestToken.getBytes(StandardCharsets.UTF_8),
                        cookieToken.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "Google 로그인 CSRF 검증에 실패했습니다.");
        }
    }
}
