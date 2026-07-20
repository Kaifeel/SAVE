package com.save.notification;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeviceTokenService {
    private final UserDeviceTokenRepository tokenRepository;
    private final UserRepository userRepository;
    public DeviceTokenService(UserDeviceTokenRepository tokenRepository, UserRepository userRepository) {
        this.tokenRepository = tokenRepository; this.userRepository = userRepository;
    }

    @Transactional
    public void register(Integer userId, DeviceTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        String token = request.token().trim();
        UserDeviceToken device = tokenRepository.findByToken(token)
                .orElseGet(() -> new UserDeviceToken(user, token, request.platform()));
        device.reactivate(user, request.platform());
        tokenRepository.save(device);
    }

    @Transactional
    public void unregister(Integer userId, String token) {
        tokenRepository.findByToken(token).ifPresent(device -> {
            if (!device.getUser().getId().equals(userId)) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "기기 토큰을 삭제할 권한이 없습니다.");
            }
            device.disable();
        });
    }

    @Transactional(readOnly = true)
    public List<UserDeviceToken> activeTokens(Integer userId) {
        return tokenRepository.findByUserIdAndEnabledTrue(userId);
    }

    @Transactional
    public void disable(String token) {
        tokenRepository.findByToken(token).ifPresent(UserDeviceToken::disable);
    }
}
