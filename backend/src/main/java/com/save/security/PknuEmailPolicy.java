package com.save.security;

import com.save.common.BusinessException;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PknuEmailPolicy {
    static final String ALLOWED_DOMAIN = "pukyong.ac.kr";

    public String requireAllowed(String rawEmail, HttpStatus rejectionStatus) {
        if (rawEmail == null) {
            throw new BusinessException(rejectionStatus,
                    "부경대학교 이메일(@pukyong.ac.kr)만 사용할 수 있습니다.");
        }
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        int separator = email.lastIndexOf('@');
        String domain = separator < 0 ? "" : email.substring(separator + 1);
        if (!ALLOWED_DOMAIN.equals(domain)) {
            throw new BusinessException(rejectionStatus,
                    "부경대학교 이메일(@pukyong.ac.kr)만 사용할 수 있습니다.");
        }
        return email;
    }
}
