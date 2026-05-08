package io.git.curation.demo.graphql.resolver;

import io.git.curation.demo.domain.User;
import io.git.curation.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

/**
 * SDL {@code type User} + 진입 Query.
 *
 * <p>엔티티 필드명이 SDL 과 일치(id/email/name)해서 별도 {@code @SchemaMapping} 불필요 — 자동 PropertyDataFetcher.
 */
@Controller
@RequiredArgsConstructor
public class UserResolver {

  private final UserRepository userRepository;

  /** Query.user(id) — 사용자 1건. */
  @QueryMapping
  public User user(@Argument Long id) {
    return userRepository.findById(id).orElse(null);
  }
}
