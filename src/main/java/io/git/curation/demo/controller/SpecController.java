package io.git.curation.demo.controller;

import io.git.curation.demo.domain.CurationSpec;
import io.git.curation.demo.repository.CurationSpecRepository;
import io.git.curation.demo.response.CurationSpecResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Spec", description = "큐레이션 스펙 조회 API")
@RestController
@RequestMapping("/api/specs")
public class SpecController {

  private final CurationSpecRepository repository;

  public SpecController(CurationSpecRepository repository) {
    this.repository = repository;
  }

  @Operation(summary = "큐레이션 스펙 목록 조회", description = "활성화된 curation_spec 전체 반환")
  @GetMapping
  public List<CurationSpecResponse> list() {
    return repository.findAllByIsActiveTrueOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  private CurationSpecResponse toResponse(CurationSpec s) {
    return new CurationSpecResponse(
        s.getId(),
        s.getCode(),
        s.getName(),
        s.getDescription(),
        s.getHydratorKey(),
        s.getRequestSpec() == null ? null : s.getRequestSpec().toString(),
        s.getResponseSpec() == null ? null : s.getResponseSpec().toString());
  }
}
