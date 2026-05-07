package io.git.curation.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.git.curation.demo.domain.Curation;
import io.git.curation.demo.domain.CurationExtension;
import io.git.curation.demo.domain.CurationSpec;
import io.git.curation.demo.exception.PayloadValidationException;
import io.git.curation.demo.repository.CurationExtensionRepository;
import io.git.curation.demo.repository.CurationRepository;
import io.git.curation.demo.repository.CurationSpecRepository;
import io.git.curation.demo.request.CurationCreateRequest;
import io.git.curation.demo.validator.PayloadValidator;
import java.util.List;
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
}
