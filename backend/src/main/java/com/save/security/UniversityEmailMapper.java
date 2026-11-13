package com.save.security;

import com.save.common.BusinessException;
import com.save.university.University;
import com.save.university.UniversityRepository;
import com.save.user.User;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class UniversityEmailMapper {
    private static final Map<String, String> UNIVERSITY_BY_EMAIL_DOMAIN = Map.of(
            "pukyong.ac.kr", "부경대학교"
    );

    private final UniversityRepository universityRepository;

    public UniversityEmailMapper(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    public void assignIfMissing(User user) {
        if (user.getUniversity() != null) return;

        String universityName = UNIVERSITY_BY_EMAIL_DOMAIN.get(domainOf(user.getEmail()));
        if (universityName == null) return;

        University university = universityRepository.findByName(universityName)
                .orElseThrow(() -> new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                        universityName + " 기준 정보가 설정되지 않았습니다."));
        user.updateProfile(user.getName(), user.getDepartment(), university, null);
    }

    private String domainOf(String email) {
        if (email == null) return "";
        int separator = email.lastIndexOf('@');
        return separator < 0 ? "" : email.substring(separator + 1).toLowerCase(Locale.ROOT);
    }
}
