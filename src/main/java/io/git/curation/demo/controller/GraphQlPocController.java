package io.git.curation.demo.controller;

import io.git.curation.demo.graphql.GraphQlPocService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** spring-graphql in-process 호출 PoC 검증용 엔드포인트. */
@Tag(name = "GraphQL PoC", description = "in-process GraphQL 호출 동작 확인")
@RestController
@RequestMapping("/api/graphql-poc")
@RequiredArgsConstructor
public class GraphQlPocController {

  private final GraphQlPocService service;

  @Operation(summary = "in-process GraphQL alcohol(id) 호출")
  @GetMapping("/alcohol/{id}")
  public Map<String, Object> alcohol(@PathVariable Long id) {
    return service.queryAlcohol(id);
  }
}
