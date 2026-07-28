package com.save.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionSecretsValidatorTest {

    @Test
    void productionRejectsDevelopmentJwtSecret() {
        assertThatThrownBy(() -> ProductionSecretsValidator.validate(
                "save-local-development-jwt-secret-change-me-2026"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void productionRejectsShortJwtSecret() {
        assertThatThrownBy(() -> ProductionSecretsValidator.validate("too-short"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
