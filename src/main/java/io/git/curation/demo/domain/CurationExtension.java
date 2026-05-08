package io.git.curation.demo.domain;

import com.fasterxml.jackson.databind.JsonNode;
import io.git.curation.demo.global.converter.JsonNodeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "curation_extension")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CurationExtension {

  @Id
  @Column(name = "curation_id")
  private Long curationId;

  @Column(name = "spec_id", nullable = false)
  private Long specId;

  @Convert(converter = JsonNodeConverter.class)
  @Column(nullable = false, columnDefinition = "json")
  private JsonNode payload;

  @Builder
  private CurationExtension(Long curationId, Long specId, JsonNode payload) {
    this.curationId = curationId;
    this.specId = specId;
    this.payload = payload;
  }
}
