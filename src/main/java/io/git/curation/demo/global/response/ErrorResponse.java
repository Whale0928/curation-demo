package io.git.curation.demo.global.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "표준 에러 응답")
public record ErrorResponse(
    @Schema(example = "400") int status,
    @Schema(example = "payload 검증 실패") String message,
    @Schema(description = "검증 실패 메시지 목록 (없으면 빈 배열)") List<String> errors) {}
