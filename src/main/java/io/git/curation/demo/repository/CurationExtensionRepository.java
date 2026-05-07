package io.git.curation.demo.repository;

import io.git.curation.demo.domain.CurationExtension;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurationExtensionRepository extends JpaRepository<CurationExtension, Long> {}
