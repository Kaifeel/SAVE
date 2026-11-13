package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.save.common.BusinessException;
import com.save.university.University;
import com.save.university.UniversityRepository;
import com.save.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UniversityEmailMapperTest {
    @Mock UniversityRepository universityRepository;

    @Test
    void assignsPukyongUniversityToAnIncompleteGoogleUser() {
        University university = new University("부경대학교");
        when(universityRepository.findByName("부경대학교"))
                .thenReturn(java.util.Optional.of(university));
        User user = new User("student@pukyong.ac.kr", "학생", null, null,
                "GOOGLE", "google-subject");

        new UniversityEmailMapper(universityRepository).assignIfMissing(user);

        assertThat(user.getUniversity()).isSameAs(university);
    }

    @Test
    void failsClearlyWhenConfiguredReferenceUniversityIsMissing() {
        when(universityRepository.findByName("부경대학교"))
                .thenReturn(java.util.Optional.empty());
        User user = new User("student@pukyong.ac.kr", "학생", null, null,
                "GOOGLE", "google-subject");

        assertThatThrownBy(() -> new UniversityEmailMapper(universityRepository)
                .assignIfMissing(user))
                .isInstanceOf(BusinessException.class)
                .hasMessage("부경대학교 기준 정보가 설정되지 않았습니다.");
    }
}
