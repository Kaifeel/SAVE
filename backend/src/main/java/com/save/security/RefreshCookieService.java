package com.save.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class RefreshCookieService {
    private final String cookieName;
    private final String cookiePath;
    private final boolean secure;
    private final Clock clock;

    public RefreshCookieService(
            @Value("${security.refresh-token.cookie-name:save_refresh}") String cookieName,
            @Value("${security.refresh-token.cookie-path:/api/v1/auth}") String cookiePath,
            @Value("${security.refresh-token.cookie-secure:false}") boolean secure,
            Clock clock) {
        this.cookieName = cookieName;
        this.cookiePath = cookiePath;
        this.secure = secure;
        this.clock = clock;
    }

    public String cookieName() {
        return cookieName;
    }

    public void write(HttpServletResponse response, String rawToken, Instant expiresAt) {
        long seconds = Math.max(0, Duration.between(clock.instant(), expiresAt).toSeconds());
        Cookie cookie = baseCookie(rawToken);
        cookie.setMaxAge((int) Math.min(Integer.MAX_VALUE, seconds));
        response.addCookie(cookie);
        writeHeader(response, rawToken, Duration.ofSeconds(seconds));
    }

    public void clear(HttpServletResponse response) {
        Cookie cookie = baseCookie("");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        writeHeader(response, "", Duration.ZERO);
    }

    private Cookie baseCookie(String value) {
        Cookie cookie = new Cookie(cookieName, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath(cookiePath);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    private void writeHeader(HttpServletResponse response, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(secure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(maxAge)
                .build();
        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
