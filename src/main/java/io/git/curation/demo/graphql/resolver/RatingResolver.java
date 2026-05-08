package io.git.curation.demo.graphql.resolver;

import io.git.curation.demo.domain.Rating;
import io.git.curation.demo.domain.User;
import io.git.curation.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

/**
 * SDL {@code type Rating} 의 필드별 fetcher.
 *
 * <p>{@code rating} 은 엔티티 getter 와 일치 → 자동 매핑.
 * EmbeddedId 분해(alcoholId/userId)·시간 포맷·user 조인만 명시.
 */
@Controller
@RequiredArgsConstructor
public class RatingResolver {

  private final UserRepository userRepository;

  /** EmbeddedId.alcoholId 분해. */
  @SchemaMapping(typeName = "Rating", field = "alcoholId")
  public Long alcoholId(Rating r) {
    return r.getId().getAlcoholId();
  }

  /** EmbeddedId.userId 분해. */
  @SchemaMapping(typeName = "Rating", field = "userId")
  public Long userId(Rating r) {
    return r.getId().getUserId();
  }

  /** Instant → ISO 문자열. */
  @SchemaMapping(typeName = "Rating", field = "createAt")
  public String createAt(Rating r) {
    return r.getCreateAt() == null ? null : r.getCreateAt().toString();
  }

  /** userId → User 객체 hydrate. */
  @SchemaMapping(typeName = "Rating", field = "user")
  public User user(Rating r) {
    return userRepository.findById(r.getId().getUserId()).orElse(null);
  }
}
