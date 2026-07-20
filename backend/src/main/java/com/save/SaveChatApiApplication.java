package com.save;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SaveChatApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(SaveChatApiApplication.class, args);
    }
}
