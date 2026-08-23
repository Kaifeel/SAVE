package com.save.security;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/mobile")
public class MobileAuthController {
    private final AuthService authService;
    private final GoogleOAuthService googleOAuthService;
    private final AuthSessionService authSessionService;

    public MobileAuthController(AuthService authService, GoogleOAuthService googleOAuthService,
                                AuthSessionService authSessionService) {
        this.authService = authService;
        this.googleOAuthService = googleOAuthService;
        this.authSessionService = authSessionService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MobileAuthResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return startSession(authService.signUp(request));
    }

    @PostMapping("/login")
    public MobileAuthResponse login(@Valid @RequestBody LoginRequest request) {
        return startSession(authService.login(request));
    }

    @PostMapping("/google")
    public MobileAuthResponse google(@Valid @RequestBody GoogleLoginRequest request) {
        return startSession(googleOAuthService.login(request.idToken()));
    }

    @PostMapping("/refresh")
    public MobileAuthResponse refresh(@Valid @RequestBody MobileRefreshRequest request) {
        return MobileAuthResponse.from(authSessionService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody MobileRefreshRequest request) {
        authSessionService.logout(request.refreshToken());
    }

    private MobileAuthResponse startSession(AuthResponse response) {
        return MobileAuthResponse.from(authSessionService.start(response));
    }
}
