package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Rating;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RatingRepository extends JpaRepository<Rating, Rating.RatingId> {

  /** 해당 알코올의 활성 rating (deleted 제외). 정렬·limit 은 Pageable 로 외부 주입. */
  @Query(
      "SELECT r FROM Rating r "
          + "WHERE r.id.alcoholId = :alcoholId AND r.deleteAt IS NULL")
  List<Rating> findActiveByAlcoholId(
      @Param("alcoholId") Long alcoholId,
      org.springframework.data.domain.Pageable pageable);

  /** 하위 호환: 기본 정렬 (최신순) — 기존 호출처용. */
  default List<Rating> findActiveByAlcoholId(Long alcoholId) {
    return findActiveByAlcoholId(
        alcoholId,
        org.springframework.data.domain.PageRequest.of(0, 1000,
            org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createAt")));
  }

  /** 평균 평점 (deleted 제외, 0점 제외). */
  @Query(
      "SELECT AVG(r.rating) FROM Rating r "
          + "WHERE r.id.alcoholId = :alcoholId AND r.deleteAt IS NULL AND r.rating > 0")
  Double findAvgRatingByAlcoholId(@Param("alcoholId") Long alcoholId);

  /** 평점 총 개수. */
  @Query(
      "SELECT COUNT(r) FROM Rating r "
          + "WHERE r.id.alcoholId = :alcoholId AND r.deleteAt IS NULL AND r.rating > 0")
  Long countByAlcoholId(@Param("alcoholId") Long alcoholId);

  /** 특정 사용자의 해당 알코올 평점 (없으면 null). */
  @Query(
      "SELECT r.rating FROM Rating r "
          + "WHERE r.id.alcoholId = :alcoholId AND r.id.userId = :userId AND r.deleteAt IS NULL")
  Double findUserRating(@Param("alcoholId") Long alcoholId, @Param("userId") Long userId);

  /** 특정 사용자의 평균 평점 (deleted/0 제외). */
  @Query(
      "SELECT AVG(r.rating) FROM Rating r "
          + "WHERE r.id.userId = :userId AND r.deleteAt IS NULL AND r.rating > 0")
  Double findUserAvgRating(@Param("userId") Long userId);
}
