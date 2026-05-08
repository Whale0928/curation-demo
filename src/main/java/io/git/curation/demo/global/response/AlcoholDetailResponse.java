package io.git.curation.demo.global.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "알코올 카드 표시용 풍부 응답 — 마스터 + 지역명 + 태그 hydrate")
public record AlcoholDetailResponse(
    @Schema(example = "1") Long alcoholId,
    String korName,
    String engName,
    String imageUrl,
    @Schema(description = "국가/지역명 (regions.kor_name)") String regionName,
    String korCategory,
    String engCategory,
    @Schema(description = "캐스크 (alcohols.cask)") String cask,
    String abv,
    String volume,
    @Schema(description = "테이스팅 태그 목록") List<TagItem> tags) {

  @Schema(description = "테이스팅 태그 단건")
  public record TagItem(Long id, String korName, String engName) {}
}
