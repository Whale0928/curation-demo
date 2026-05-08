package io.git.curation.demo.global.init;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.git.curation.demo.domain.CurationSpec;
import io.git.curation.demo.repository.CurationSpecRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 부트 기동 시 {@code spec/*.json} 디렉터리를 읽어 {@code curation_spec} 테이블과 동기화.
 *
 * <p>code(=x-curation.code) 기준 upsert — 기존 row 의 id 는 보존되어 curation FK 가 깨지지 않음.
 *
 * <ul>
 *   <li>info.title → name
 *   <li>info.description → description
 *   <li>x-curation.hydratorKey → hydrator_key
 *   <li>components.schemas.*Request → request_spec
 *   <li>components.schemas.*Response → response_spec
 * </ul>
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class SpecBootstrap implements CommandLineRunner {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Path SPEC_DIR = Paths.get("spec");
  private static final String DEFAULT_HYDRATOR_KEY = "alcohol";

  private final CurationSpecRepository repository;

  @Override
  @Transactional
  public void run(String... args) {
    if (!Files.isDirectory(SPEC_DIR)) {
      log.warn(
          "[SpecBootstrap] spec/ 디렉터리 없음 ({}) — 시드 스킵", SPEC_DIR.toAbsolutePath());
      return;
    }
    try (Stream<Path> stream = Files.list(SPEC_DIR)) {
      stream
          .filter(p -> p.toString().endsWith(".json"))
          .sorted()
          .forEach(this::loadOne);
    } catch (IOException e) {
      throw new IllegalStateException("spec 디렉터리 읽기 실패: " + SPEC_DIR.toAbsolutePath(), e);
    }
    log.info("[SpecBootstrap] sync done. total={}", repository.count());
  }

  private void loadOne(Path file) {
    JsonNode doc;
    try {
      doc = MAPPER.readTree(file.toFile());
    } catch (IOException e) {
      log.error("[SpecBootstrap] {} 읽기 실패: {}", file.getFileName(), e.getMessage());
      return;
    }

    JsonNode meta = doc.path("x-curation");
    String code = meta.path("code").asText("");
    if (code.isEmpty()) {
      log.warn("[SpecBootstrap] {} → x-curation.code 없음, 스킵", file.getFileName());
      return;
    }

    String name = doc.path("info").path("title").asText(code);
    String description = doc.path("info").path("description").asText(null);
    String hydratorKey = meta.path("hydratorKey").asText(DEFAULT_HYDRATOR_KEY);

    JsonNode schemas = doc.path("components").path("schemas");
    JsonNode requestSpec = pickSchemaBySuffix(schemas, "Request");
    JsonNode responseSpec = pickSchemaBySuffix(schemas, "Response");
    if (requestSpec == null || responseSpec == null) {
      log.warn(
          "[SpecBootstrap] {} → Request/Response 스키마 누락 (req={}, resp={}), 스킵",
          file.getFileName(), requestSpec != null, responseSpec != null);
      return;
    }
    // x-curation.container 메타를 request_spec 에 inline 으로 주입 (서비스 가독성·하위 호환)
    String container = meta.path("container").asText("object");
    if (requestSpec instanceof ObjectNode req) {
      req.put("x-container", container);
    }

    Optional<CurationSpec> existing = repository.findByCode(code);
    if (existing.isPresent()) {
      CurationSpec s = existing.get();
      s.updateContent(name, description, hydratorKey, requestSpec, responseSpec);
      repository.save(s);
      log.info("[SpecBootstrap] update {} (id={}, file={})", code, s.getId(), file.getFileName());
    } else {
      CurationSpec saved =
          repository.save(
              CurationSpec.create(code, name, description, hydratorKey, requestSpec, responseSpec));
      log.info(
          "[SpecBootstrap] insert {} (id={}, file={})", code, saved.getId(), file.getFileName());
    }
  }

  private JsonNode pickSchemaBySuffix(JsonNode schemas, String suffix) {
    if (!schemas.isObject()) {
      return null;
    }
    Iterator<String> it = schemas.fieldNames();
    while (it.hasNext()) {
      String name = it.next();
      if (name.endsWith(suffix)) {
        return schemas.get(name);
      }
    }
    return null;
  }
}
