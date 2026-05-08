package io.git.curation.demo.graphql.resolver;

import io.git.curation.demo.domain.Pick;
import io.git.curation.demo.domain.User;
import io.git.curation.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

/**
 * SDL {@code type Pick} 의 필드별 fetcher.
 *
 * <p>{@code id/alcoholId/userId/status} 는 엔티티 getter 와 일치 → 자동 매핑.
 * 시간 포맷·user 조인만 명시.
 */
@Controller
@RequiredArgsConstructor
public class PickResolver {

  private final UserRepository userRepository;

  /** Instant → ISO 문자열. */
  @SchemaMapping(typeName = "Pick", field = "createAt")
  public String createAt(Pick p) {
    return p.getCreateAt() == null ? null : p.getCreateAt().toString();
  }

  /** userId → User 객체 hydrate. */
  @SchemaMapping(typeName = "Pick", field = "user")
  public User user(Pick p) {
    return userRepository.findById(p.getUserId()).orElse(null);
  }
}
