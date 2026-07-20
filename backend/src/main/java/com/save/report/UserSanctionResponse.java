package com.save.report;

import java.time.LocalDateTime;

public record UserSanctionResponse(Integer id, String status, String reason,
                                   LocalDateTime updatedAt) {}
