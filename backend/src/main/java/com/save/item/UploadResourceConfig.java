package com.save.item;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {
    private final PhotoStorageService photoStorageService;

    public UploadResourceConfig(PhotoStorageService photoStorageService) {
        this.photoStorageService = photoStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (photoStorageService.getUploadDirectory() != null) {
            String location = photoStorageService.getUploadDirectory().toUri().toString();
            registry.addResourceHandler("/uploads/**").addResourceLocations(location);
        }
    }
}
