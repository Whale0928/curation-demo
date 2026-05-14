package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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

  @Column(name = "image_url_2")
  private String imageUrl2;

  @Column(name = "image_url_3")
  private String imageUrl3;

  @Column(name = "exposure_start_date")
  private LocalDate exposureStartDate;

  @Column(name = "exposure_end_date")
  private LocalDate exposureEndDate;

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
      String imageUrl2,
      String imageUrl3,
      LocalDate exposureStartDate,
      LocalDate exposureEndDate,
      Integer displayOrder,
      Boolean isActive) {
    this.specId = specId;
    this.name = name;
    this.description = description;
    this.coverImageUrl = coverImageUrl;
    this.imageUrl2 = imageUrl2;
    this.imageUrl3 = imageUrl3;
    this.exposureStartDate = exposureStartDate;
    this.exposureEndDate = exposureEndDate;
    this.displayOrder = displayOrder == null ? 0 : displayOrder;
    this.isActive = isActive == null ? Boolean.TRUE : isActive;
  }

  public List<String> getImageUrls() {
    return java.util.stream.Stream.of(coverImageUrl, imageUrl2, imageUrl3)
        .filter(v -> v != null && !v.isBlank())
        .toList();
  }
}
