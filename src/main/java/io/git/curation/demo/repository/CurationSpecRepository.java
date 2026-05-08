package io.git.curation.demo.repository;

import io.git.curation.demo.domain.CurationSpec;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurationSpecRepository extends JpaRepository<CurationSpec, Long> {

  List<CurationSpec> findAllByIsActiveTrueOrderByIdAsc();

  Optional<CurationSpec> findByCode(String code);
}
