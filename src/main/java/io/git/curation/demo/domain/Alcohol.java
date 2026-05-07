package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "alcohols")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Alcohol {

  @Id
  private Long id;

  @Column(name = "kor_name", nullable = false)
  private String korName;

  @Column(name = "eng_name", nullable = false)
  private String engName;

  @Column(name = "image_url")
  private String imageUrl;

  private String abv;
  private String type;

  @Column(name = "kor_category", nullable = false)
  private String korCategory;

  @Column(name = "eng_category", nullable = false)
  private String engCategory;

  @Column(name = "category_group", nullable = false)
  private String categoryGroup;

  @Column(name = "region_id")
  private Long regionId;

  @Column(name = "distillery_id")
  private Long distilleryId;

  private String age;
  private String cask;
  private String volume;

  @Column(columnDefinition = "text")
  private String description;

  @Column(name = "create_at")
  private Instant createAt;

  @Column(name = "last_modify_at")
  private Instant lastModifyAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;
}
