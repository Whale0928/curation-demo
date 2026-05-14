package io.git.curation.demo.global.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "큐레이션 등록 요청")
public record CurationCreateRequest(

    @Schema(description = "사용할 스펙 ID", example = "2")
    @NotNull
    Long specId,

    @Schema(description = "큐레이션 이름", example = "봄 추천 위스키")
    @NotBlank
    String name,

    @Schema(description = "큐레이션 설명")
    String description,

    @Schema(description = "커버 이미지 URL")
    String coverImageUrl,

    @Schema(description = "큐레이션 이미지 URL 목록. 최대 3장까지 사용", example = "[\"https://...\"]")
    List<String> imageUrls,

    @Schema(description = "노출기간 시작일", example = "2025-06-05")
    LocalDate exposureStartDate,

    @Schema(description = "노출기간 종료일", example = "2025-06-10")
    LocalDate exposureEndDate,

    @Schema(description = "노출 순서", example = "0")
    Integer displayOrder,

    @Schema(description = "활성화 여부", example = "true")
    Boolean isActive,

    @Schema(
        type = "object",
        description = "스펙의 requestSpec 을 따르는 payload JSON. 서버에서 JSON Schema 검증 후 저장.")
    @NotNull
    Object payload) {}
