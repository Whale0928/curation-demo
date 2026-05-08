package io.git.curation.demo.global.response;

import com.fasterxml.jackson.annotation.JsonRawValue;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * 큐레이션 상세 응답.
 * - 헤더 (id, name, description ...)
 * - spec  : 스펙 메타 + responseSpec (OpenAPI Schema)
 * - payload: 본문. alcohol 외 다른 도메인 키도 들어올 수 있음.
 */
@Schema(description = "큐레이션 상세. 최상위는 헤더 + spec + payload 구조.")
public record CurationDetailResponse(
    Long id,
    String name,
    String description,
    String coverImageUrl,
    Integer displayOrder,
    Boolean isActive,
    Instant createAt,

    @Schema(description = "스펙 메타 + 표시용 OpenAPI responseSpec") SpecMeta spec,

    @Schema(
        type = "object",
        description = "큐레이션 본문. 키 종류는 스펙에 따라 달라짐 (alcohol·users·food 등). hydrate 된 형태.")
    @JsonRawValue
        String payload) {

  @Schema(description = "스펙 메타 정보")
  public record SpecMeta(
      Long id,
      String code,
      String name,
      @Schema(description = "array | object") String container,
      @Schema(type = "object", description = "OpenAPI Schema. x-form-style/x-field-style 동봉.")
          @JsonRawValue
          String responseSpec) {}
}
