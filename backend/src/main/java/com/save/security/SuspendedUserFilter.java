package com.save.security;

import com.save.user.UserRepository;
import com.save.user.UserStatus;
import com.save.user.User;
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
            User user = userId == null ? null : userRepository.findById(userId).orElse(null);
            if (user == null) {
                reject(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "유효하지 않은 사용자 세션입니다.");
                return;
            }
            if (user.getStatus() != UserStatus.ACTIVE) {
                reject(response, HttpServletResponse.SC_FORBIDDEN,
                        "정지된 사용자는 서비스에 접근할 수 없습니다.");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }

    private Integer parseUserId(String subject) {
        try {
            return Integer.valueOf(subject);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
