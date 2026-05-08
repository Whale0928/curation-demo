package io.git.curation.demo.controller;

import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.domain.Distillery;
import io.git.curation.demo.domain.Region;
import io.git.curation.demo.repository.AlcoholRepository;
import io.git.curation.demo.repository.DistilleryRepository;
import io.git.curation.demo.repository.PickRepository;
import io.git.curation.demo.repository.RatingRepository;
import io.git.curation.demo.repository.RegionRepository;
import io.git.curation.demo.repository.TastingTagRepository;
import io.git.curation.demo.global.response.AlcoholDetailItem;
import io.git.curation.demo.global.response.AlcoholDetailResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Alcohol", description = "알코올 마스터 조회 (데모)")
@RestController
@RequestMapping("/api/alcohols")
public class AlcoholController {

  private final AlcoholRepository repository;
  private final RegionRepository regionRepository;
  private final TastingTagRepository tastingTagRepository;
  private final DistilleryRepository distilleryRepository;
  private final RatingRepository ratingRepository;
  private final PickRepository pickRepository;

  public AlcoholController(
      AlcoholRepository repository,
      RegionRepository regionRepository,
      TastingTagRepository tastingTagRepository,
      DistilleryRepository distilleryRepository,
      RatingRepository ratingRepository,
      PickRepository pickRepository) {
    this.repository = repository;
    this.regionRepository = regionRepository;
    this.tastingTagRepository = tastingTagRepository;
    this.distilleryRepository = distilleryRepository;
    this.ratingRepository = ratingRepository;
    this.pickRepository = pickRepository;
  }

  @Operation(summary = "알코올 리스트 조회 (limit 만큼)")
  @GetMapping
  public List<Alcohol> list(@RequestParam(defaultValue = "20") int limit) {
    return repository
        .findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "id")))
        .getContent();
  }

  @Operation(summary = "알코올 검색 (이름)", description = "kor_name 또는 eng_name 부분일치. 위젯의 검색창에서 호출.")
  @GetMapping("/search")
  public List<Alcohol> search(
      @RequestParam("q") String q, @RequestParam(defaultValue = "10") int limit) {
    if (q == null || q.isBlank()) return List.of();
    return repository.searchByName(q.trim(), PageRequest.of(0, limit));
  }

  @Operation(
      summary = "알코올 상세 (카드 표시용)",
      description = "마스터 + 지역명 + 테이스팅 태그 hydrate. alcohol-card 위젯이 카드 본문에 사용.")
  @GetMapping("/{id}/detail")
  public AlcoholDetailResponse detail(@PathVariable Long id) {
    Alcohol a =
        repository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("알코올 없음: id=" + id));

    String regionName =
        a.getRegionId() == null
            ? null
            : regionRepository.findById(a.getRegionId()).map(Region::getKorName).orElse(null);

    List<AlcoholDetailResponse.TagItem> tags =
        tastingTagRepository.findByAlcoholIdRaw(id).stream()
            .map(
                row ->
                    new AlcoholDetailResponse.TagItem(
                        ((Number) row[0]).longValue(), (String) row[1], (String) row[2]))
            .toList();

    return new AlcoholDetailResponse(
        a.getId(),
        a.getKorName(),
        a.getEngName(),
        a.getImageUrl(),
        regionName,
        a.getKorCategory(),
        a.getEngCategory(),
        a.getCask(),
        a.getAbv(),
        a.getVolume(),
        tags);
  }

  @Operation(
      summary = "알코올 둘러보기 단건 — bottle-note 의 AlcoholDetailItem 응답 복제",
      description = "알코올 마스터 + region/distillery + 평점 집계 + 사용자 평점·찜 컨텍스트")
  @GetMapping("/{id}/explore")
  public AlcoholDetailItem explore(
      @PathVariable Long id,
      @RequestParam(required = false) Long userId) {
    Alcohol a =
        repository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("알코올 없음: id=" + id));

    Region region =
        a.getRegionId() == null ? null : regionRepository.findById(a.getRegionId()).orElse(null);
    Distillery distillery =
        a.getDistilleryId() == null
            ? null
            : distilleryRepository.findById(a.getDistilleryId()).orElse(null);

    Double avgRating = ratingRepository.findAvgRatingByAlcoholId(id);
    Long totalRatings = ratingRepository.countByAlcoholId(id);

    Double myRating = null;
    Double myAvgRating = null;
    Boolean isPicked = null;
    if (userId != null) {
      myRating = ratingRepository.findUserRating(id, userId);
      myAvgRating = ratingRepository.findUserAvgRating(userId);
      isPicked = pickRepository.isPicked(userId, id);
    }

    List<AlcoholDetailItem.TastingTagItem> tagItems =
        tastingTagRepository.findByAlcoholIdRaw(id).stream()
            .map(
                row ->
                    new AlcoholDetailItem.TastingTagItem(
                        ((Number) row[0]).longValue(), (String) row[1], (String) row[2]))
            .toList();

    return new AlcoholDetailItem(
        a.getId(),
        a.getImageUrl(),
        a.getKorName(),
        a.getEngName(),
        a.getKorCategory(),
        a.getEngCategory(),
        region == null ? null : region.getKorName(),
        region == null ? null : region.getEngName(),
        a.getCask(),
        a.getAbv(),
        distillery == null ? null : distillery.getKorName(),
        distillery == null ? null : distillery.getEngName(),
        avgRating == null ? null : Math.round(avgRating * 100.0) / 100.0,
        totalRatings == null ? 0L : totalRatings,
        myRating,
        myAvgRating == null ? null : Math.round(myAvgRating * 100.0) / 100.0,
        isPicked,
        tagItems);
  }
}
