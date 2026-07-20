package com.save.item;

import java.util.List;

public record ItemPageResponse(List<ItemResponse> content, PageableResponse pageable,
                               long totalElements) {
    public record PageableResponse(int pageNumber, int pageSize) {}
}
