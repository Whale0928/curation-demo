package io.git.curation.demo.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "큐레이션 목록 카드 항목")
public record CurationListItem(
    Long id,
    Long specId,
    String specCode,
    String specName,
    String name,
    String description,
    String coverImageUrl,
    Integer displayOrder,
    Boolean isActive,
    Instant createAt) {}
