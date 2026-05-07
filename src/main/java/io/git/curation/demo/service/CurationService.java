package io.git.curation.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.git.curation.demo.domain.Curation;
import io.git.curation.demo.domain.CurationExtension;
import io.git.curation.demo.domain.CurationSpec;
import io.git.curation.demo.exception.PayloadValidationException;
import io.git.curation.demo.hydrator.AlcoholHydrator;
import io.git.curation.demo.repository.CurationExtensionRepository;
import io.git.curation.demo.repository.CurationRepository;
import io.git.curation.demo.repository.CurationSpecRepository;
import io.git.curation.demo.request.CurationCreateRequest;
import io.git.curation.demo.response.AlcoholDetailResponse;
import io.git.curation.demo.response.CurationDetailResponse;
import io.git.curation.demo.response.CurationListItem;
import io.git.curation.demo.validator.PayloadValidator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CurationService {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final CurationSpecRepository specRepository;
  private final CurationRepository curationRepository;
  private final CurationExtensionRepository extensionRepository;
  private final PayloadValidator validator;
  private final AlcoholHydrator alcoholHydrator;

  @Transactional
  public Long create(CurationCreateRequest request) {
    CurationSpec spec =
        specRepository
            .findById(request.specId())
            .orElseThrow(
                () -> new IllegalArgumentException("스펙을 찾을 수 없음: id=" + request.specId()));

    JsonNode payloadNode = MAPPER.valueToTree(request.payload());

    List<String> errors = validator.validate(spec.getRequestSpec(), payloadNode);
    if (!errors.isEmpty()) {
      throw new PayloadValidationException(errors);
    }

    Curation curation =
        curationRepository.save(
            Curation.builder()
                .specId(spec.getId())
                .name(request.name())
                .description(request.description())
                .coverImageUrl(request.coverImageUrl())
                .displayOrder(request.displayOrder())
                .isActive(request.isActive())
                .build());

    extensionRepository.save(
        CurationExtension.builder()
            .curationId(curation.getId())
            .specId(spec.getId())
            .payload(payloadNode)
            .build());

    return curation.getId();
  }

  @Transactional(readOnly = true)
  public List<CurationListItem> list() {
    Map<Long, CurationSpec> specMap = new HashMap<>();
    specRepository.findAll().forEach(s -> specMap.put(s.getId(), s));
    return curationRepository.findAll().stream()
        .map(
            c -> {
              CurationSpec s = specMap.get(c.getSpecId());
              return new CurationListItem(
                  c.getId(),
                  c.getSpecId(),
                  s == null ? null : s.getCode(),
                  s == null ? null : s.getName(),
                  c.getName(),
                  c.getDescription(),
                  c.getCoverImageUrl(),
                  c.getDisplayOrder(),
                  c.getIsActive(),
                  c.getCreateAt());
            })
        .toList();
  }

  @Transactional(readOnly = true)
  public CurationDetailResponse detail(Long id) {
    Curation c =
        curationRepository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("큐레이션을 찾을 수 없음: id=" + id));
    CurationSpec spec =
        specRepository
            .findById(c.getSpecId())
            .orElseThrow(() -> new IllegalStateException("스펙 누락: id=" + c.getSpecId()));
    CurationExtension ext = extensionRepository.findById(id).orElse(null);
    JsonNode payload = ext == null ? null : ext.getPayload();

    String container =
        spec.getRequestSpec() != null && spec.getRequestSpec().has("x-container")
            ? spec.getRequestSpec().get("x-container").asText()
            : "object";

    Map<Long, AlcoholDetailResponse> alcohols =
        payload == null ? Map.of() : alcoholHydrator.hydrate(payload);

    return new CurationDetailResponse(
        c.getId(),
        c.getSpecId(),
        spec.getCode(),
        spec.getName(),
        container,
        c.getName(),
        c.getDescription(),
        c.getCoverImageUrl(),
        c.getDisplayOrder(),
        c.getIsActive(),
        c.getCreateAt(),
        spec.getResponseSpec() == null ? null : spec.getResponseSpec().toString(),
        payload == null ? null : payload.toString(),
        alcohols);
  }
}
