package io.git.curation.demo.controller;

import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.domain.Region;
import io.git.curation.demo.repository.AlcoholRepository;
import io.git.curation.demo.repository.RegionRepository;
import io.git.curation.demo.repository.TastingTagRepository;
import io.git.curation.demo.response.AlcoholDetailResponse;
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

  public AlcoholController(
      AlcoholRepository repository,
      RegionRepository regionRepository,
      TastingTagRepository tastingTagRepository) {
    this.repository = repository;
    this.regionRepository = regionRepository;
    this.tastingTagRepository = tastingTagRepository;
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
}
