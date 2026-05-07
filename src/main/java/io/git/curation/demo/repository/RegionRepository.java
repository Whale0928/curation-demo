package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Region;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, Long> {}
