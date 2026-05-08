package io.git.curation.demo.graphql;

import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.repository.AlcoholRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

/**
 * GraphQL Resolver — PoC 단계.
 * SDL 의 Query 진입점(@QueryMapping) + 필드 매핑(@SchemaMapping) 학습.
 */
@Controller
@RequiredArgsConstructor
public class AlcoholGraphController {

  private final AlcoholRepository alcoholRepository;

  @QueryMapping
  public Alcohol alcohol(@Argument Long id) {
    return alcoholRepository.findById(id).orElse(null);
  }

  @QueryMapping
  public List<Alcohol> alcohols(@Argument List<Long> ids) {
    return alcoholRepository.findAllById(ids);
  }

  /** SDL 의 alcoholId ↔ entity.id 매핑 (필드명 다른 케이스). */
  @SchemaMapping(typeName = "Alcohol", field = "alcoholId")
  public Long alcoholId(Alcohol alcohol) {
    return alcohol.getId();
  }
}
