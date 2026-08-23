package com.save.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
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

    public String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    public void write(HttpServletResponse response, String rawToken, Instant expiresAt) {
        long seconds = Math.max(0, Duration.between(clock.instant(), expiresAt).toSeconds());
        response.addHeader(HttpHeaders.SET_COOKIE,
                buildCookie(rawToken, Duration.ofSeconds(seconds)).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE,
                buildCookie("", Duration.ZERO).toString());
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(secure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(maxAge)
                .build();
    }
}
