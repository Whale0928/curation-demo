package io.git.curation.demo.domain;

import com.fasterxml.jackson.databind.JsonNode;
import io.git.curation.demo.converter.JsonNodeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "curation_spec")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CurationSpec {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String code;

  @Column(nullable = false)
  private String name;

  private String description;

  @Column(name = "hydrator_key", nullable = false)
  private String hydratorKey;

  @Convert(converter = JsonNodeConverter.class)
  @Column(name = "request_spec", nullable = false, columnDefinition = "json")
  private JsonNode requestSpec;

  @Convert(converter = JsonNodeConverter.class)
  @Column(name = "response_spec", nullable = false, columnDefinition = "json")
  private JsonNode responseSpec;

  @Column(nullable = false)
  private Integer version;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive;

  @Column(name = "create_at")
  private Instant createAt;

  @Column(name = "last_modify_at")
  private Instant lastModifyAt;
}
