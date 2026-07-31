package com.save.item;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/items")
public class ItemController {
    private final ItemService itemService;

    public ItemController(ItemService itemService) { this.itemService = itemService; }

    @GetMapping
    public ItemPageResponse list(@RequestParam(required = false) String type,
                                   @RequestParam(required = false) String query,
                                   @RequestParam(name = "only_available", defaultValue = "false") boolean onlyAvailable,
                                   @RequestParam(defaultValue = "latest") String sort,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size,
                                   @RequestParam(name = "university_id", required = false)
                                   Integer universityId,
                                   @AuthenticationPrincipal Jwt jwt) {
        return itemService.list(type, query, onlyAvailable, sort, page, size,
                universityId, userId(jwt));
    }

    @GetMapping("/{itemId}")
    public ItemResponse detail(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt) {
        return itemService.detail(itemId, userId(jwt));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse createJson(@AuthenticationPrincipal Jwt jwt,
                                   @RequestBody ItemUpsertRequest request) {
        return itemService.create(userId(jwt), request);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse createMultipart(@AuthenticationPrincipal Jwt jwt,
                                        @ModelAttribute ItemUpsertRequest request) {
        return itemService.create(userId(jwt), request);
    }

    @PutMapping(value = "/{itemId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ItemResponse updateJson(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt,
                                   @RequestBody ItemUpsertRequest request) {
        return itemService.update(itemId, userId(jwt), request);
    }

    @PutMapping(value = "/{itemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemResponse updateMultipart(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt,
                                        @ModelAttribute ItemUpsertRequest request) {
        return itemService.update(itemId, userId(jwt), request);
    }

    @PatchMapping("/{itemId}/status")
    public ItemResponse updateStatus(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt,
                                     @Valid @RequestBody ItemStatusUpdateRequest request) {
        return itemService.changeStatus(itemId, userId(jwt), request.status());
    }

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt) {
        itemService.delete(itemId, userId(jwt));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
