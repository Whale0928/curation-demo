package io.git.curation.demo.global.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "큐레이션 등록 결과")
public record CurationCreateResponse(
    @Schema(description = "생성된 큐레이션 ID", example = "1") Long id) {}
