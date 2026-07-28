package com.save.security;

import com.save.user.UserRepository;
import com.save.user.UserStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

public class SuspendedUserFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    public SuspendedUserFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            Integer userId = parseUserId(jwt.getSubject());
            boolean suspended = userId != null
                    && userRepository.findById(userId)
                    .map(user -> user.getStatus() == UserStatus.SUSPENDED)
                    .orElse(false);
            if (suspended) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"message\":\"정지된 사용자는 서비스에 접근할 수 없습니다.\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private Integer parseUserId(String subject) {
        try {
            return Integer.valueOf(subject);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
