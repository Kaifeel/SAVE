package com.save.security;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.university.University;
import com.save.university.UniversityRepository;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final UniversityRepository universityRepository;
    private final PknuEmailPolicy emailPolicy;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenService jwtTokenService, UniversityRepository universityRepository,
                       PknuEmailPolicy emailPolicy) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.universityRepository = universityRepository;
        this.emailPolicy = emailPolicy;
    }

    @Transactional
    public AuthResponse signUp(SignUpRequest request) {
        String email = emailPolicy.requireAllowed(request.email(), HttpStatus.BAD_REQUEST);
        validateBcryptLength(request.password());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }
        String department = request.department() == null ? null : request.department().trim();
        User user = User.local(email, passwordEncoder.encode(request.password()),
                request.name().trim(), department);
        University university = findUniversity(request.universityId());
        user.updateProfile(request.name(), department, university, null);
        return response(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        validateBcryptLength(request.password());
        String email = emailPolicy.requireAllowed(request.email(), HttpStatus.UNAUTHORIZED);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(this::invalidCredentials);
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return response(user);
    }

    private AuthResponse response(User user) {
        return new AuthResponse(jwtTokenService.issue(user), "Bearer", false,
                AuthUserResponse.from(user));
    }

    private void validateBcryptLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
        }
    }

    private BusinessException invalidCredentials() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    private University findUniversity(Integer universityId) {
        if (universityId == null) return null;
        return universityRepository.findById(universityId)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "등록되지 않은 대학입니다."));
    }
}
