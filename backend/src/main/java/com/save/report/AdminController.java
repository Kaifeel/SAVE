package com.save.report;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final ReportService reportService;
    public AdminController(ReportService reportService) { this.reportService = reportService; }

    @GetMapping("/reports")
    public List<ReportResponse> reports() { return reportService.list(); }

    @GetMapping("/reports/{reportId}")
    public ReportResponse report(@PathVariable Integer reportId) { return reportService.detail(reportId); }

    @PatchMapping("/reports/{reportId}/status")
    public ReportResponse updateStatus(@PathVariable Integer reportId,
                                       @Valid @RequestBody ReportStatusUpdateRequest request) {
        return reportService.changeStatus(reportId, request.status());
    }

    @DeleteMapping("/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable Integer itemId) { reportService.deleteItem(itemId); }

    @PatchMapping("/users/{userId}/sanction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sanction(@PathVariable Integer userId,
                         @Valid @RequestBody UserSanctionRequest request) {
        reportService.sanctionUser(userId, request);
    }
}
