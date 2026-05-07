package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tasting_tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TastingTag {

  @Id
  private Long id;

  @Column(name = "kor_name", nullable = false)
  private String korName;

  @Column(name = "eng_name", nullable = false)
  private String engName;

  private String description;

  @Column(name = "parent_id")
  private Long parentId;
}
