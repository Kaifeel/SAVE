package com.save.security;

import com.save.common.BusinessException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthOriginValidator {
    private final Set<String> allowedOrigins;

    public AuthOriginValidator(@Value("${security.cors.allowed-origins}") String configuredOrigins) {
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public void requireAllowedWhenPresent(String origin) {
        if (origin != null && !origin.isBlank() && !allowedOrigins.contains(origin)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "허용되지 않은 요청 출처입니다.");
        }
    }
}
