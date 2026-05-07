package io.git.curation.demo.response;

import com.fasterxml.jackson.annotation.JsonRawValue;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Map;

@Schema(description = "큐레이션 상세. 헤더 + 스펙 + payload + alcohol hydrate 매핑")
public record CurationDetailResponse(
    Long id,
    Long specId,
    String specCode,
    String specName,
    @Schema(description = "스펙의 컨테이너 형태 (array | object)") String container,
    String name,
    String description,
    String coverImageUrl,
    Integer displayOrder,
    Boolean isActive,
    Instant createAt,
    @Schema(type = "object", description = "스펙의 responseSpec — 표시용 OpenAPI Schema. x-form-style/x-field-style 동봉.")
        @JsonRawValue
        String responseSpec,
    @Schema(type = "object", description = "DB 의 payload (등록값. array 또는 object)")
        @JsonRawValue
        String payload,
    @Schema(description = "payload 안의 alcoholId 들을 도메인에서 hydrate 한 매핑 (id → 상세 객체)")
        Map<Long, AlcoholDetailResponse> alcohols) {}
