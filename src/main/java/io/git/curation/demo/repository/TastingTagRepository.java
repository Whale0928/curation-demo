package io.git.curation.demo.repository;

import io.git.curation.demo.domain.TastingTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TastingTagRepository extends JpaRepository<TastingTag, Long> {

  /** 한 알코올의 태그 목록 (alcohols_tasting_tags 매핑 → tasting_tags) */
  @Query(
      value = "SELECT t.id, t.kor_name, t.eng_name "
          + "FROM alcohols_tasting_tags att "
          + "JOIN tasting_tags t ON t.id = att.tasting_tag_id "
          + "WHERE att.alcohol_id = :alcoholId "
          + "ORDER BY t.id",
      nativeQuery = true)
  List<Object[]> findByAlcoholIdRaw(@Param("alcoholId") Long alcoholId);
}
