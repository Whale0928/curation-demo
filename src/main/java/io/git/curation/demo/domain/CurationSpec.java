package io.git.curation.demo.domain;

import com.fasterxml.jackson.databind.JsonNode;
import io.git.curation.demo.global.converter.JsonNodeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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

  /** 신규 spec 등록용 factory. id·createAt 은 영속화 시 자동 채워짐. */
  public static CurationSpec create(
      String code,
      String name,
      String description,
      String hydratorKey,
      JsonNode requestSpec,
      JsonNode responseSpec) {
    CurationSpec s = new CurationSpec();
    s.code = code;
    s.name = name;
    s.description = description;
    s.hydratorKey = hydratorKey;
    s.requestSpec = requestSpec;
    s.responseSpec = responseSpec;
    s.version = 1;
    s.isActive = Boolean.TRUE;
    return s;
  }

  /** spec 본문 갱신 (code 는 식별자라 변경 불가). */
  public void updateContent(
      String name,
      String description,
      String hydratorKey,
      JsonNode requestSpec,
      JsonNode responseSpec) {
    this.name = name;
    this.description = description;
    this.hydratorKey = hydratorKey;
    this.requestSpec = requestSpec;
    this.responseSpec = responseSpec;
    if (this.version != null) {
      this.version += 1;
    }
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    if (this.createAt == null) {
      this.createAt = now;
    }
    this.lastModifyAt = now;
    if (this.version == null) {
      this.version = 1;
    }
    if (this.isActive == null) {
      this.isActive = Boolean.TRUE;
    }
  }

  @PreUpdate
  void onUpdate() {
    this.lastModifyAt = Instant.now();
  }
}
