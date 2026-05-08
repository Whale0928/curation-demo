package io.git.curation.demo.domain;

import jakarta.persistence.Column;
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
@Table(name = "picks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Pick {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "alcohol_id", nullable = false)
  private Long alcoholId;

  /** PICK / UNPICK */
  @Column(nullable = false)
  private String status;

  @Column(name = "create_at", insertable = false, updatable = false)
  private Instant createAt;

  @Column(name = "last_modify_at", insertable = false, updatable = false)
  private Instant lastModifyAt;
}
