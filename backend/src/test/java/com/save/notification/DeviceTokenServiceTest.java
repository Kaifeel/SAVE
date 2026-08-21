package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.save.user.User;
import com.save.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DeviceTokenServiceTest {
    @Test
    void unregisterNormalizesTokenBeforeLookup() {
        UserDeviceTokenRepository tokenRepository = mock(UserDeviceTokenRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7);
        UserDeviceToken device = new UserDeviceToken(user, "device-token", DevicePlatform.ANDROID);
        when(tokenRepository.findByToken("device-token")).thenReturn(Optional.of(device));
        DeviceTokenService service = new DeviceTokenService(tokenRepository, userRepository);

        service.unregister(7, "  device-token  ");

        assertThat(device.isEnabled()).isFalse();
    }
}
