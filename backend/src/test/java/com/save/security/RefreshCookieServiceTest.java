package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RefreshCookieServiceTest {

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-08-15T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void configuredCookieNameIsUsedForReadingAndWriting() {
        RefreshCookieService service = new RefreshCookieService(
                "configured_refresh", "/api/v1/auth", true, clock);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("configured_refresh", "raw-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThat(service.read(request)).isEqualTo("raw-token");

        service.write(response, "rotated-token", clock.instant().plusSeconds(60));

        Cookie cookie = MockCookie.parse(response.getHeader(HttpHeaders.SET_COOKIE));
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("rotated-token");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(response.getHeaders("Set-Cookie")).hasSize(1);
    }
}
