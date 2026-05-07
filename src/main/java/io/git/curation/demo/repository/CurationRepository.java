package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Curation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurationRepository extends JpaRepository<Curation, Long> {}
