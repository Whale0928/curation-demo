package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "distilleries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Distillery {

  @Id
  private Long id;

  @Column(name = "kor_name", nullable = false)
  private String korName;

  @Column(name = "eng_name", nullable = false)
  private String engName;

  @Column(name = "logo_img_url")
  private String logoImgUrl;
}
