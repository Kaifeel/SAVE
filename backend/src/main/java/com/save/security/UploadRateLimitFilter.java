package com.save.security;

import com.save.storage.UploadRequestLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

/** Runs after JWT and account checks, before MVC multipart parsing and image decoding. */
public class UploadRateLimitFilter extends OncePerRequestFilter {
    private final UploadRequestLimiter limiter;
    public UploadRateLimitFilter(UploadRequestLimiter limiter) { this.limiter = limiter; }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String type = request.getContentType();
        return type == null || !type.toLowerCase(Locale.ROOT).startsWith("multipart/form-data")
                || !("POST".equals(request.getMethod()) || "PUT".equals(request.getMethod())
                || "PATCH".equals(request.getMethod()));
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws IOException, ServletException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Jwt jwt)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        long retryAfter = limiter.acquire(jwt.getSubject());
        if (retryAfter > 0) {
            response.setStatus(429);
            response.setHeader("Retry-After", Long.toString(retryAfter));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
