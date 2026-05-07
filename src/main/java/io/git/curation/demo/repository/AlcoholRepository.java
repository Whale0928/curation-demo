package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Alcohol;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlcoholRepository extends JpaRepository<Alcohol, Long> {

  @Query(
      "SELECT a FROM Alcohol a "
          + "WHERE a.deletedAt IS NULL AND ("
          + "LOWER(a.korName) LIKE LOWER(CONCAT('%', :q, '%')) OR "
          + "LOWER(a.engName) LIKE LOWER(CONCAT('%', :q, '%'))"
          + ") ORDER BY a.id ASC")
  List<Alcohol> searchByName(@Param("q") String q, Pageable pageable);
}
