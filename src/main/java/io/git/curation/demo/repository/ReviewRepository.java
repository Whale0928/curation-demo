package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Review;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

  List<Review> findByAlcoholIdAndDeleteAtIsNullOrderByCreateAtDesc(Long alcoholId);
}
