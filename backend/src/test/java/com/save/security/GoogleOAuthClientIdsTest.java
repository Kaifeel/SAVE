package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GoogleOAuthClientIdsTest {

    @Test
    void parsesDistinctTrimmedClientIds() {
        assertThat(GoogleOAuthService.parseClientIds("web-id, android-id,ios-id,web-id"))
                .containsExactly("web-id", "android-id", "ios-id");
    }

    @Test
    void keepsAnEmptyClientIdListUnconfigured() {
        assertThat(GoogleOAuthService.parseClientIds(" , ")).isEmpty();
    }
}
