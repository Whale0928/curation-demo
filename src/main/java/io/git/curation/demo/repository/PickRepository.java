package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Pick;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PickRepository extends JpaRepository<Pick, Long> {

  /** 해당 알코올의 모든 pick 이력 (id 오름차순). */
  List<Pick> findByAlcoholIdOrderByIdAsc(Long alcoholId);

  /** 사용자의 해당 알코올 status 를 id 내림차순으로 (가장 최근이 첫 항목). */
  @Query(
      "SELECT p.status FROM Pick p "
          + "WHERE p.userId = :userId AND p.alcoholId = :alcoholId "
          + "ORDER BY p.id DESC")
  List<String> findStatusOrdered(
      @Param("userId") Long userId, @Param("alcoholId") Long alcoholId, Limit limit);

  /** 마지막 row 의 status가 'PICK' 이면 true. 없거나 UNPICK 이면 false. */
  default boolean isPicked(Long userId, Long alcoholId) {
    List<String> list = findStatusOrdered(userId, alcoholId, Limit.of(1));
    return !list.isEmpty() && "PICK".equals(list.get(0));
  }

  /** 해당 알코올의 활성 찜 수 — 사용자별 마지막 row 가 PICK 인 사람 수. */
  @Query(
      value =
          "SELECT COUNT(*) FROM ("
              + "  SELECT user_id, "
              + "    (SELECT status FROM picks p2 "
              + "     WHERE p2.user_id = p1.user_id AND p2.alcohol_id = :alcoholId "
              + "     ORDER BY p2.id DESC LIMIT 1) AS last_status "
              + "  FROM picks p1 "
              + "  WHERE p1.alcohol_id = :alcoholId "
              + "  GROUP BY user_id"
              + ") t WHERE t.last_status = 'PICK'",
      nativeQuery = true)
  Long countActivePicks(@Param("alcoholId") Long alcoholId);
}
