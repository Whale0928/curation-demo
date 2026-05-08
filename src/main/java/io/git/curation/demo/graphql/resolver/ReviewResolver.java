package io.git.curation.demo.graphql.resolver;

import io.git.curation.demo.domain.Review;
import io.git.curation.demo.domain.User;
import io.git.curation.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

/**
 * SDL {@code type Review} 의 필드별 fetcher.
 *
 * <p>{@code id/alcoholId/userId/title/content/rating} 는 엔티티 getter 와 일치 → 자동 매핑.
 * 시간 포맷·user 조인만 명시.
 */
@Controller
@RequiredArgsConstructor
public class ReviewResolver {

  private final UserRepository userRepository;

  /** Instant → ISO 문자열 (작성 시각). */
  @SchemaMapping(typeName = "Review", field = "createAt")
  public String createAt(Review r) {
    return r.getCreateAt() == null ? null : r.getCreateAt().toString();
  }

  /** Instant → ISO 문자열 (수정 시각). */
  @SchemaMapping(typeName = "Review", field = "lastModifyAt")
  public String lastModifyAt(Review r) {
    return r.getLastModifyAt() == null ? null : r.getLastModifyAt().toString();
  }

  /** userId → User 객체 hydrate. */
  @SchemaMapping(typeName = "Review", field = "user")
  public User user(Review r) {
    return userRepository.findById(r.getUserId()).orElse(null);
  }
}
