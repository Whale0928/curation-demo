package io.git.curation.demo.global.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "큐레이션 목록 카드 항목")
public record CurationListItem(
    Long id,
    Long specId,
    String specCode,
    String specName,
    String name,
    String description,
    String coverImageUrl,
    List<String> imageUrls,
    LocalDate exposureStartDate,
    LocalDate exposureEndDate,
    Integer displayOrder,
    Boolean isActive,
    Instant createAt) {}
