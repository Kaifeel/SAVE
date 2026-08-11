package com.save.security;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthSessionService {
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;

    public AuthSessionService(RefreshTokenService refreshTokenService,
                              UserRepository userRepository,
                              JwtTokenService jwtTokenService) {
        this.refreshTokenService = refreshTokenService;
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional
    public AuthSession start(AuthResponse response) {
        if (response == null || response.user() == null || response.user().id() == null) {
            throw invalidSession();
        }
        User user = userRepository.findById(response.user().id()).orElseThrow(this::invalidSession);
        IssuedRefreshToken issued = refreshTokenService.issue(user);
        return new AuthSession(response, issued.rawToken(), issued.expiresAt());
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public AuthSession refresh(String rawToken) {
        RotatedRefreshToken rotated = refreshTokenService.rotate(rawToken);
        User user = userRepository.findById(rotated.user().getId()).orElseThrow(this::invalidSession);
        AuthResponse response = new AuthResponse(jwtTokenService.issue(user), "Bearer", false,
                AuthUserResponse.from(user));
        return new AuthSession(response, rotated.rawToken(), rotated.expiresAt());
    }

    public void logout(String rawToken) {
        refreshTokenService.revokeFamily(rawToken);
    }

    private BusinessException invalidSession() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요.");
    }
}
