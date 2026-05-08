package io.git.curation.demo.controller;

import io.git.curation.demo.global.request.CurationCreateRequest;
import io.git.curation.demo.global.response.CurationCreateResponse;
import io.git.curation.demo.global.response.CurationDetailResponse;
import io.git.curation.demo.global.response.CurationListItem;
import io.git.curation.demo.service.CurationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Curation", description = "큐레이션 등록·조회 API")
@RestController
@RequestMapping("/api/curations")
@RequiredArgsConstructor
public class CurationController {

  private final CurationService curationService;

  @Operation(
      summary = "큐레이션 등록",
      description = "specId 로 스펙을 찾아 payload 를 JSON Schema 검증한 뒤 curation + curation_extension 에 저장한다.")
  @PostMapping
  public ResponseEntity<CurationCreateResponse> create(
      @Valid @RequestBody CurationCreateRequest request) {
    Long id = curationService.create(request);
    return ResponseEntity.ok(new CurationCreateResponse(id));
  }

  @Operation(summary = "큐레이션 목록", description = "전체 curation 헤더 리스트")
  @GetMapping
  public List<CurationListItem> list() {
    return curationService.list();
  }

  @Operation(
      summary = "큐레이션 상세",
      description = "헤더 + 스펙 + payload + alcohol hydrate 매핑")
  @GetMapping("/{id}")
  public CurationDetailResponse detail(@PathVariable Long id) {
    return curationService.detail(id);
  }
}
