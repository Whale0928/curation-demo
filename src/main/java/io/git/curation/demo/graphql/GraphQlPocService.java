package io.git.curation.demo.graphql;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.ExecutionGraphQlRequest;
import org.springframework.graphql.ExecutionGraphQlResponse;
import org.springframework.graphql.ExecutionGraphQlService;
import org.springframework.graphql.support.DefaultExecutionGraphQlRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * in-process GraphQL 호출 PoC.
 * - HTTP 안 탐. ExecutionGraphQlService 를 직접 주입받아 메서드 호출로 query 실행.
 * - 마이크로서비스 분리 시점엔 이 자리에 HttpGraphQlClient 로 바꾸면 됨 (인터페이스 동일).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GraphQlPocService {

  private final ExecutionGraphQlService graphQlService;

  public Map<String, Object> queryAlcohol(Long id) {
    String document =
        "query Get($id: ID!) { alcohol(id: $id) { alcoholId korName engName cask abv volume } }";

    ExecutionGraphQlRequest request =
        new DefaultExecutionGraphQlRequest(
            document,
            "Get",
            Map.of("id", id),
            Map.of(),
            "poc-" + id,
            null);

    ExecutionGraphQlResponse response = Mono.from(graphQlService.execute(request)).block();
    log.info("[in-process] query='{}' executed. errors={}", "alcohol",
        response == null ? "null" : response.getExecutionResult().getErrors());
    return response == null ? Map.of() : response.getExecutionResult().toSpecification();
  }
}
