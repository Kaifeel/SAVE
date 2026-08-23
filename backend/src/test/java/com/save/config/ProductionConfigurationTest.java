package com.save.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionConfigurationTest {

    @Test
    void productionUsesPostgresFlywayAndJpaValidation() {
        new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues(
                        "spring.profiles.active=prod",
                        "DB_URL=jdbc:postgresql://localhost:5432/save",
                        "DB_USERNAME=save",
                        "DB_PASSWORD=secret",
                        "JWT_SECRET=01234567890123456789012345678901",
                        "CORS_ALLOWED_ORIGINS=https://save.example")
                .run(context -> {
                    assertThat(context.getEnvironment()
                            .getProperty("spring.datasource.url"))
                            .isEqualTo("jdbc:postgresql://localhost:5432/save");
                    assertThat(context.getEnvironment()
                            .getProperty("spring.jpa.hibernate.ddl-auto"))
                            .isEqualTo("validate");
                    assertThat(context.getEnvironment()
                            .getProperty("spring.flyway.enabled"))
                            .isEqualTo("true");
                    assertThat(context.getEnvironment()
                            .getProperty("spring.h2.console.enabled"))
                            .isEqualTo("false");
                    assertThat(context.getEnvironment()
                            .getProperty("expo.push.enabled"))
                            .isEqualTo("false");
                    assertThat(context.getEnvironment()
                            .getProperty("expo.push.base-url"))
                            .isEqualTo("https://exp.host");
                });
    }
}
