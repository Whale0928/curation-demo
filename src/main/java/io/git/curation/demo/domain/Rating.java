package io.git.curation.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ratings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Rating {

  @EmbeddedId
  private RatingId id;

  @Column(nullable = false)
  private Double rating;

  @Column(name = "create_at", insertable = false, updatable = false)
  private Instant createAt;

  @Column(name = "delete_at")
  private Instant deleteAt;

  @Embeddable
  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class RatingId implements Serializable {
    @Column(name = "alcohol_id", nullable = false)
    private Long alcoholId;

    @Column(name = "user_id", nullable = false)
    private Long userId;
  }
}
