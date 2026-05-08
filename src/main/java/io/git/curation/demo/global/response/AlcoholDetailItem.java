package io.git.curation.demo.global.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * bottle-note 의 알코올 탐색 응답 스펙 복제.
 * AlcoholExploreController 의 AlcoholDetailItem 과 동일한 형태.
 */
@Schema(description = "알코올 탐색 응답 항목 — 알코올 마스터 + 평점 집계 + 사용자 컨텍스트(평점·찜)")
public record AlcoholDetailItem(

    @Schema(description = "술 ID") Long alcoholId,
    @Schema(description = "술 이미지 URL") String alcoholUrlImg,
    @Schema(description = "술 한글명") String korName,
    @Schema(description = "술 영문명") String engName,
    @Schema(description = "카테고리 한글명") String korCategory,
    @Schema(description = "카테고리 영문명") String engCategory,
    @Schema(description = "지역 한글명") String korRegion,
    @Schema(description = "지역 영문명") String engRegion,
    @Schema(description = "캐스크 정보") String cask,
    @Schema(description = "알코올 도수") String abv,
    @Schema(description = "증류소 한글명") String korDistillery,
    @Schema(description = "증류소 영문명") String engDistillery,

    @Schema(description = "전체 평균 평점 (소수점 2자리 반올림)") Double rating,
    @Schema(description = "평점 총 개수") Long totalRatingsCount,

    @Schema(description = "현재 사용자의 평점 (없으면 null)") Double myRating,
    @Schema(description = "현재 사용자의 평균 평점 (없으면 null)") Double myAvgRating,

    @Schema(description = "현재 사용자가 찜했는지") Boolean isPicked,

    @Schema(description = "테이스팅 태그 목록") List<TastingTagItem> tastingTags) {

  @Schema(description = "테이스팅 태그 단건")
  public record TastingTagItem(Long id, String korName, String engName) {}
}
