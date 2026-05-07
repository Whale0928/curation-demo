package io.git.curation.demo.response;

import com.fasterxml.jackson.annotation.JsonRawValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "큐레이션 스펙 — DB(curation_spec) 에 등록된 OpenAPI 양식 한 건")
public record CurationSpecResponse(

    @Schema(description = "스펙 ID", example = "2")
    Long id,

    @Schema(description = "스펙 코드 (시스템 내 유일 식별자)", example = "ALCOHOL_RECOMMEND")
    String code,

    @Schema(description = "스펙 표시명", example = "위스키 추천")
    String name,

    @Schema(description = "스펙 설명")
    String description,

    @Schema(description = "응답 hydrate 를 담당하는 도메인 키", example = "alcohol")
    String hydratorKey,

    @Schema(
        type = "object",
        description = "OpenAPI Schema — 등록·수정 시 받는 요청 슬롯 정의 (DB 원본 JSON 그대로 전달)")
    @JsonRawValue
    String requestSpec,

    @Schema(
        type = "object",
        description = "OpenAPI Schema — 조회 시 hydrate 된 응답 형태 (DB 원본 JSON 그대로 전달)")
    @JsonRawValue
    String responseSpec
) {}
