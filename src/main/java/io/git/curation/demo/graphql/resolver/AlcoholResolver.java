package io.git.curation.demo.graphql.resolver;

import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.domain.Pick;
import io.git.curation.demo.domain.Rating;
import io.git.curation.demo.domain.Region;
import io.git.curation.demo.domain.Review;
import io.git.curation.demo.repository.AlcoholRepository;
import io.git.curation.demo.repository.PickRepository;
import io.git.curation.demo.repository.RatingRepository;
import io.git.curation.demo.repository.RegionRepository;
import io.git.curation.demo.repository.ReviewRepository;
import io.git.curation.demo.repository.TastingTagRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

/**
 * SDL {@code type Alcohol} + 진입 Query.
 *
 * <p>엔티티에 없는 계산·조인·집계 필드는 {@code @SchemaMapping} 으로 lazy 채움.
 */
@Controller
@RequiredArgsConstructor
public class AlcoholResolver {

  private final AlcoholRepository alcoholRepository;
  private final RegionRepository regionRepository;
  private final RatingRepository ratingRepository;
  private final PickRepository pickRepository;
  private final TastingTagRepository tastingTagRepository;
  private final ReviewRepository reviewRepository;

  // -------------------------------------------------- Query 진입

  /** Query.alcohol(id) — 알코올 1건. */
  @QueryMapping
  public Alcohol alcohol(@Argument Long id) {
    return alcoholRepository.findById(id).orElse(null);
  }

  /** Query.alcohols(ids) — 알코올 N건 배치. */
  @QueryMapping
  public List<Alcohol> alcohols(@Argument List<Long> ids) {
    return alcoholRepository.findAllById(ids);
  }

  // -------------------------------------------------- Alcohol 필드

  /** SDL.alcoholId ↔ entity.id 매핑. */
  @SchemaMapping(typeName = "Alcohol", field = "alcoholId")
  public Long alcoholId(Alcohol a) {
    return a.getId();
  }

  /** regions 테이블 조인 → 한글 지역명. */
  @SchemaMapping(typeName = "Alcohol", field = "regionName")
  public String regionName(Alcohol a) {
    if (a.getRegionId() == null) {
      return null;
    }
    return regionRepository.findById(a.getRegionId()).map(Region::getKorName).orElse(null);
  }

  /** 평균 별점 (deleted/0점 제외). */
  @SchemaMapping(typeName = "Alcohol", field = "rating")
  public Double rating(Alcohol a) {
    return ratingRepository.findAvgRatingByAlcoholId(a.getId());
  }

  /** 별점 참여자 수. */
  @SchemaMapping(typeName = "Alcohol", field = "totalRatingsCount")
  public Long totalRatingsCount(Alcohol a) {
    return ratingRepository.countByAlcoholId(a.getId());
  }

  /** 데모: review count = rating count 동일 source. */
  @SchemaMapping(typeName = "Alcohol", field = "reviewCount")
  public Long reviewCount(Alcohol a) {
    return ratingRepository.countByAlcoholId(a.getId());
  }

  /** 활성 찜 수 — 사용자별 마지막 row 가 PICK 인 사람 수. */
  @SchemaMapping(typeName = "Alcohol", field = "totalPickCount")
  public Long totalPickCount(Alcohol a) {
    return pickRepository.countActivePicks(a.getId());
  }

  /** 테이스팅 태그 목록 (alcohols_tasting_tags JOIN tasting_tags). */
  @SchemaMapping(typeName = "Alcohol", field = "tags")
  public List<TagView> tags(Alcohol a) {
    return tastingTagRepository.findByAlcoholIdRaw(a.getId()).stream()
        .map(row -> new TagView(
            ((Number) row[0]).longValue(),
            (String) row[1],
            (String) row[2]))
        .toList();
  }

  /** 알코올의 pick 이력. limit 1~20 (기본 10), sort=LATEST|POPULAR (PICK 위주). */
  @SchemaMapping(typeName = "Alcohol", field = "picks")
  public List<Pick> picks(Alcohol a,
                          @Argument Integer limit,
                          @Argument String sort) {
    // PICK status 정렬은 의미가 약해 LATEST/POPULAR 둘 다 createAt DESC 동일 처리
    return pickRepository.findByAlcoholId(a.getId(), pageable(limit, "createAt", "DESC"));
  }

  /** 알코올 별점. limit 1~20 (기본 10), sort=LATEST|POPULAR(별점 높은 순). */
  @SchemaMapping(typeName = "Alcohol", field = "ratings")
  public List<Rating> ratings(Alcohol a,
                              @Argument Integer limit,
                              @Argument String sort) {
    String field = "POPULAR".equalsIgnoreCase(sort) ? "rating" : "createAt";
    return ratingRepository.findActiveByAlcoholId(a.getId(), pageable(limit, field, "DESC"));
  }

  /** 알코올 리뷰. limit 1~20 (기본 10), sort=LATEST|POPULAR(별점 높은 순). */
  @SchemaMapping(typeName = "Alcohol", field = "reviews")
  public List<Review> reviews(Alcohol a,
                              @Argument Integer limit,
                              @Argument String sort) {
    String field = "POPULAR".equalsIgnoreCase(sort) ? "rating" : "createAt";
    return reviewRepository.findByAlcoholIdAndDeleteAtIsNull(
        a.getId(), pageable(limit, field, "DESC"));
  }

  // -------------------------------------------------- helpers

  private static final int DEFAULT_LIMIT = 10;
  private static final int MAX_LIMIT = 20;

  /** limit·sort 정규화 후 Pageable 생성. limit null/<=0 → 10, > 20 → 20. */
  private Pageable pageable(Integer limit, String sortField, String direction) {
    int size = limit == null || limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
    Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);
    return PageRequest.of(0, size, sort);
  }

  /** SDL {@code type Tag} 응답 DTO. */
  public record TagView(Long id, String korName, String engName) {}
}
