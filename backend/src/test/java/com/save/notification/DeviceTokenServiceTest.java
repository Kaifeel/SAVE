package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class DeviceTokenServiceTest {
    private final UserDeviceTokenRepository tokenRepository = mock(UserDeviceTokenRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final DeviceTokenService service = new DeviceTokenService(tokenRepository, userRepository);
    private final User user = mock(User.class);

    @BeforeEach
    void setUp() {
        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(user.getId()).thenReturn(7);
    }

    @Test
    void acceptsAndTrimsBothExpoPushTokenPrefixes() {
        when(tokenRepository.findByToken(any())).thenReturn(Optional.empty());

        service.register(7, new DeviceTokenRequest(
                "  ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]  ", DevicePlatform.ANDROID));
        service.register(7, new DeviceTokenRequest(
                "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]", DevicePlatform.IOS));

        ArgumentCaptor<UserDeviceToken> devices = ArgumentCaptor.forClass(UserDeviceToken.class);
        verify(tokenRepository, org.mockito.Mockito.times(2)).save(devices.capture());
        assertThat(devices.getAllValues()).extracting(UserDeviceToken::getToken).containsExactly(
                "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
                "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "fcm-device-token", "ExpoPushToken[]", "ExpoPushToken[has space]"})
    void rejectsBlankAndNonExpoTokens(String token) {
        assertThatThrownBy(() -> service.register(
                7, new DeviceTokenRequest(token, DevicePlatform.ANDROID)))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsTokensLongerThanTheDatabaseLimit() {
        String token = "ExpoPushToken[" + "x".repeat(500) + "]";

        assertThatThrownBy(() -> service.register(
                7, new DeviceTokenRequest(token, DevicePlatform.ANDROID)))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void transfersAnExistingTokenToTheAuthenticatedUser() {
        User previousOwner = mock(User.class);
        UserDeviceToken existing = new UserDeviceToken(
                previousOwner, "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]", DevicePlatform.IOS);
        when(tokenRepository.findByToken(existing.getToken())).thenReturn(Optional.of(existing));

        service.register(7, new DeviceTokenRequest(existing.getToken(), DevicePlatform.ANDROID));

        assertThat(existing.getUser()).isSameAs(user);
        assertThat(existing.getPlatform()).isEqualTo(DevicePlatform.ANDROID);
        assertThat(existing.isEnabled()).isTrue();
        verify(tokenRepository).save(existing);
    }
}
