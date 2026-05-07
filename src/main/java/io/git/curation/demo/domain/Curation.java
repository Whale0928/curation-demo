package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "curation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Curation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "spec_id", nullable = false)
  private Long specId;

  @Column(nullable = false)
  private String name;

  private String description;

  @Column(name = "cover_image_url")
  private String coverImageUrl;

  @Column(name = "display_order", nullable = false)
  private Integer displayOrder;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive;

  @Column(name = "create_at", insertable = false, updatable = false)
  private Instant createAt;

  @Column(name = "last_modify_at", insertable = false, updatable = false)
  private Instant lastModifyAt;

  @Builder
  private Curation(
      Long specId,
      String name,
      String description,
      String coverImageUrl,
      Integer displayOrder,
      Boolean isActive) {
    this.specId = specId;
    this.name = name;
    this.description = description;
    this.coverImageUrl = coverImageUrl;
    this.displayOrder = displayOrder == null ? 0 : displayOrder;
    this.isActive = isActive == null ? Boolean.TRUE : isActive;
  }
}
