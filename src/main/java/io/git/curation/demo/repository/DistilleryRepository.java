package io.git.curation.demo.repository;

import io.git.curation.demo.domain.Distillery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DistilleryRepository extends JpaRepository<Distillery, Long> {}
