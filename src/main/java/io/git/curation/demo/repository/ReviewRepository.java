package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Review;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

  /** 알코올의 활성 리뷰 (deleteAt IS NULL). 정렬·limit 은 Pageable. */
  List<Review> findByAlcoholIdAndDeleteAtIsNull(Long alcoholId, Pageable pageable);

  /** 하위 호환: 기본 정렬(createAt DESC). */
  List<Review> findByAlcoholIdAndDeleteAtIsNullOrderByCreateAtDesc(Long alcoholId);
}
