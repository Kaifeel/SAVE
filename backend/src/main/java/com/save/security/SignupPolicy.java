package com.save.security;

import com.save.common.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class SignupPolicy {
    private final boolean enabled;

    public SignupPolicy(@Value("${auth.signup.enabled:true}") boolean enabled) {
        this.enabled = enabled;
    }

    public void requireEnabled() {
        if (!enabled) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "회원가입이 비활성화되어 있습니다.");
        }
    }
}
