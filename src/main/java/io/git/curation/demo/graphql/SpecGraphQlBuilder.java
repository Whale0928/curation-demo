package io.git.curation.demo.graphql;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 큐레이션 응답 스펙(JsonNode) + payload(JsonNode) 를 GraphQL query 로 변환.
 *
 * <p>스펙 안 {@code x-graphql} 인라인 메타가 source-of-truth — 별도 매핑 테이블 없음.
 *
 * <h3>진입점 메타 (객체)</h3>
 * <table border="1">
 *   <caption>x-graphql 키</caption>
 *   <tr><th>키</th><th>의미</th><th>디폴트</th></tr>
 *   <tr><td>{@code query}</td><td>GraphQL Query 이름</td><td>(필수)</td></tr>
 *   <tr><td>{@code argName}</td><td>Query 인자 이름</td><td>{@code id}</td></tr>
 *   <tr><td>{@code argType}</td><td>Query 인자 GraphQL 타입</td><td>{@code ID!}</td></tr>
 *   <tr><td>{@code argFrom}</td><td>payload 안 인자 추출 path (JSON path)</td><td>{@code $}</td></tr>
 *   <tr><td>{@code writeTo}</td><td>hydrate 결과를 박을 자식 키. null 이면 element 자체 머지</td><td>null</td></tr>
 *   <tr><td>{@code resultKey}</td><td>GraphQL 결과 객체의 매칭 PK</td><td>{@code alcoholId}</td></tr>
 *   <tr><td>{@code payloadPath}</td><td>payload 안 subtree 위치</td><td>{@code $}</td></tr>
 * </table>
 *
 * <h3>leaf 메타 (스칼라/객체)</h3>
 * <ul>
 *   <li>{@code true} → 키 그대로 GraphQL 필드로 selection 포함
 *   <li>{@code "필드명"}(string) → 다른 GraphQL 필드명으로 매핑
 *   <li>{@code { args: "limit: 10, sort: LATEST" }} → 인자 박힌 selection (자식 필드 페이지·정렬)
 *   <li>{@code { field: "korName", args: "..." }} → 이름 매핑 + 인자
 *   <li>(생략) → selection 제외
 * </ul>
 */
@Slf4j
@Component
public class SpecGraphQlBuilder {

  private static final String META_KEY = "x-graphql";
  private static final String JSON_PATH_ROOT = "$";
  private static final String JSON_PATH_PREFIX = "$.";
  private static final String DEFAULT_ARG_NAME = "id";
  private static final String DEFAULT_ARG_TYPE = "ID!";
  private static final String DEFAULT_RESULT_KEY = "alcoholId";

  /**
   * GraphQL 호출 한 건의 빌드 결과.
   *
   * @param query GraphQL 문서 (query string)
   * @param variables variables map
   * @param entryField GraphQL 결과 data 안 진입 필드명 (= query name)
   * @param joinKey payload element 의 매칭 키 (argFrom 의 leaf segment)
   * @param writeTo hydrate 결과를 박을 자리. null 이면 element 자체에 키 머지.
   * @param writeMode {@code "array"} 면 writeTo 자리에 결과 배열, {@code "single"} 이면 단일 객체.
   *     (spec 의 writeTo 키 type 으로 자동 추론)
   * @param resultKey GraphQL 결과 객체의 매칭 PK
   * @param payloadPath payload 안 subtree 위치 (JSON path)
   */
  public record Result(
      String query,
      Map<String, Object> variables,
      String entryField,
      String joinKey,
      String writeTo,
      String writeMode,
      String resultKey,
      String payloadPath) {}

  public static final String WRITE_MODE_ARRAY = "array";
  public static final String WRITE_MODE_SINGLE = "single";

  /** spec 트리를 walk 해서 발견된 모든 진입점에 대해 한 쌍씩 반환. */
  public List<Result> build(JsonNode responseSpec, JsonNode payload) {
    List<Result> out = new ArrayList<>();
    walk(responseSpec, payload, out);
    logBuildSummary(out, payload);
    return out;
  }

  /** {@code "$.x.y"} → {@code root.x.y}. {@code "$"} 또는 null → root 그대로. */
  public static JsonNode navigate(JsonNode root, String path) {
    if (root == null || path == null || JSON_PATH_ROOT.equals(path)) {
      return root;
    }
    String trimmed = stripPathPrefix(path);
    if (trimmed.isEmpty()) {
      return root;
    }
    JsonNode cur = root;
    for (String seg : trimmed.split("\\.")) {
      if (cur == null) {
        return null;
      }
      cur = cur.get(seg);
    }
    return cur;
  }

  // ------------------------------------------------------------- spec walk

  /** spec 트리 DFS — 진입점 메타를 만나면 빌드, 아니면 properties/items 로 재귀. */
  private void walk(JsonNode node, JsonNode payload, List<Result> out) {
    if (node == null || !node.isObject()) {
      return;
    }
    JsonNode meta = node.get(META_KEY);
    if (isEntryPointMeta(meta)) {
      out.add(buildOne(node, meta, payload));
      return;
    }
    JsonNode properties = node.get("properties");
    if (properties != null && properties.isObject()) {
      properties.properties().forEach(e -> walk(e.getValue(), payload, out));
    }
    JsonNode items = node.get("items");
    if (items != null) {
      walk(items, payload, out);
    }
  }

  /** {@code x-graphql} 메타가 객체이고 {@code query} 키를 가지면 진입점 — 빌드 대상. */
  private boolean isEntryPointMeta(JsonNode meta) {
    return meta != null && meta.isObject() && meta.has("query");
  }

  /** 진입점 노드 1개 → 완성된 {@link Result} (query string + variables + 머지 메타). */
  private Result buildOne(JsonNode entry, JsonNode meta, JsonNode payload) {
    String queryName = meta.get("query").asText();
    String argName = meta.path("argName").asText(DEFAULT_ARG_NAME);
    String argType = meta.path("argType").asText(DEFAULT_ARG_TYPE);
    String argFrom = meta.path("argFrom").asText(JSON_PATH_ROOT);
    String writeTo = meta.has("writeTo") ? meta.get("writeTo").asText(null) : null;
    String resultKey = meta.path("resultKey").asText(DEFAULT_RESULT_KEY);
    String payloadPath = meta.path("payloadPath").asText(JSON_PATH_ROOT);

    JsonNode subPayload = navigate(payload, payloadPath);
    Object argValue = extractArg(subPayload, argFrom);
    Map<String, Object> variables = new HashMap<>();
    variables.put(argName, argValue);

    JsonNode selectionRoot = resolveSelectionRoot(entry, writeTo);
    String selection = String.join(" ", collectSelection(selectionRoot));
    String query =
        String.format(
            "query Q($%s: %s) { %s(%s: $%s) { %s } }",
            argName, argType, queryName, argName, argName, selection);

    String writeMode = resolveWriteMode(entry, writeTo);
    return new Result(
        query, variables, queryName, lastSegment(argFrom), writeTo, writeMode, resultKey, payloadPath);
  }

  /** writeTo 키의 spec 상 type 이 array 면 array 모드, 그 외 single. */
  private String resolveWriteMode(JsonNode entry, String writeTo) {
    if (writeTo == null) {
      return WRITE_MODE_ARRAY;
    }
    String type = entry.path("properties").path(writeTo).path("type").asText();
    return "array".equals(type) ? WRITE_MODE_ARRAY : WRITE_MODE_SINGLE;
  }

  // ------------------------------------------------------------- selection

  /**
   * GraphQL selection set 을 추출할 spec 노드를 결정.
   *
   * <ul>
   *   <li>writeTo 지정 → entry.properties[writeTo] (배열이면 items 까지)
   *   <li>entry 가 array → entry.items
   *   <li>그 외 → entry 자체
   * </ul>
   */
  private JsonNode resolveSelectionRoot(JsonNode entry, String writeTo) {
    if (writeTo != null) {
      JsonNode target = entry.path("properties").path(writeTo);
      if (target.isMissingNode()) {
        return entry;
      }
      return target.has("items") ? target.get("items") : target;
    }
    if ("array".equals(entry.path("type").asText())) {
      return entry.has("items") ? entry.get("items") : entry;
    }
    return entry;
  }

  /** {@code x-graphql} 메타가 박힌 leaf 만 selection 에 포함. nested object/array 는 재귀. */
  private List<String> collectSelection(JsonNode node) {
    List<String> out = new ArrayList<>();
    if (node == null) {
      return out;
    }
    JsonNode props = node.get("properties");
    if (props == null || !props.isObject()) {
      return out;
    }
    for (Map.Entry<String, JsonNode> e : props.properties()) {
      JsonNode child = e.getValue();
      JsonNode childMeta = child.get(META_KEY);
      if (childMeta == null) {
        continue;
      }
      // 진입점 객체 (별도 hydrate query) 는 selection 포함 X
      if (childMeta.isObject() && childMeta.has("query")) {
        continue;
      }
      String fieldName = resolveFieldName(e.getKey(), childMeta);
      String args = renderArgs(childMeta);
      JsonNode itemsNode = child.get("items");
      boolean hasNested = child.has("properties") || (itemsNode != null && itemsNode.has("properties"));
      if (hasNested) {
        JsonNode subSchema = itemsNode != null ? itemsNode : child;
        out.add(fieldName + args + " { " + String.join(" ", collectSelection(subSchema)) + " }");
      } else {
        out.add(fieldName + args);
      }
    }
    return out;
  }

  /** leaf 메타에서 GraphQL 필드명 결정. {@code true} 면 키 그대로, string 이면 그 값, object 의 field 키. */
  private String resolveFieldName(String key, JsonNode meta) {
    if (meta.isTextual()) {
      return meta.asText();
    }
    if (meta.isObject() && meta.has("field")) {
      return meta.get("field").asText(key);
    }
    return key;
  }

  /** {@code x-graphql.args} 가 있으면 {@code (limit: 10, sort: LATEST)} 형태로 wrap. */
  private String renderArgs(JsonNode meta) {
    if (!meta.isObject() || !meta.has("args")) {
      return "";
    }
    String raw = meta.get("args").asText("").trim();
    if (raw.isEmpty()) {
      return "";
    }
    return "(" + raw + ")";
  }

  // ------------------------------------------------------------- arg extract

  /**
   * payload 가 array 면 element 별 argFrom 적용 후 평탄화·dedupe. object 면 단건 추출.
   *
   * <p>argFrom 결과가 그 자체로 array(예: alcoholIds)인 경우까지 flatten 하여 GraphQL ID 리스트로 만든다.
   */
  private Object extractArg(JsonNode payload, String argFrom) {
    if (payload == null) {
      return null;
    }
    if (payload.isArray()) {
      Set<Object> bag = new LinkedHashSet<>();
      payload.forEach(el -> addFlat(bag, readPath(el, argFrom)));
      bag.remove(null);
      return new ArrayList<>(bag);
    }
    Object single = readPath(payload, argFrom);
    if (single instanceof List<?> list) {
      Set<Object> bag = new LinkedHashSet<>(list);
      bag.remove(null);
      return new ArrayList<>(bag);
    }
    return single;
  }

  /** 값이 List 면 풀어서 dedupe-Set 에 누적, 스칼라면 그대로 add. */
  private void addFlat(Set<Object> bag, Object v) {
    if (v == null) {
      return;
    }
    if (v instanceof List<?> list) {
      for (Object item : list) {
        addFlat(bag, item);
      }
      return;
    }
    bag.add(v);
  }

  /** JSON path 따라 노드 navigate 후 Java 값으로 변환. {@code "$"} 면 root 자체. */
  private Object readPath(JsonNode node, String path) {
    if (node == null) {
      return null;
    }
    String trimmed = stripPathPrefix(path);
    JsonNode cursor = node;
    if (!trimmed.isEmpty()) {
      for (String seg : trimmed.split("\\.")) {
        if (cursor == null) {
          return null;
        }
        cursor = cursor.get(seg);
      }
    }
    return jsonToJava(cursor);
  }

  /** {@link JsonNode} → 일반 Java 객체 (Number/String/Boolean/List/Map). variables 직렬화용. */
  private Object jsonToJava(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    if (node.isInt()) {
      return node.asInt();
    }
    if (node.isLong()) {
      return node.asLong();
    }
    if (node.isFloatingPointNumber()) {
      return node.asDouble();
    }
    if (node.isBoolean()) {
      return node.asBoolean();
    }
    if (node.isTextual()) {
      return node.asText();
    }
    if (node.isArray()) {
      List<Object> arr = new ArrayList<>(node.size());
      node.forEach(c -> arr.add(jsonToJava(c)));
      return arr;
    }
    if (node.isObject()) {
      Map<String, Object> map = new HashMap<>();
      node.properties().forEach(e -> map.put(e.getKey(), jsonToJava(e.getValue())));
      return map;
    }
    return null;
  }

  // ------------------------------------------------------------- utils

  /** {@code "$.x.y"} → {@code "x.y"}, {@code "$"} → {@code ""}, 그 외는 그대로. */
  private static String stripPathPrefix(String path) {
    if (path.startsWith(JSON_PATH_PREFIX)) {
      return path.substring(2);
    }
    if (JSON_PATH_ROOT.equals(path)) {
      return "";
    }
    return path;
  }

  /** path 의 마지막 segment — {@code "$.alcoholIds"} → {@code "alcoholIds"} (joinKey 도출용). */
  private static String lastSegment(String path) {
    String trimmed = stripPathPrefix(path);
    int idx = trimmed.lastIndexOf('.');
    return idx < 0 ? trimmed : trimmed.substring(idx + 1);
  }

  /** 빌드 결과 요약을 INFO 로 한 줄씩 — query 본문은 DEBUG 로만. */
  private void logBuildSummary(List<Result> entries, JsonNode payload) {
    log.info(
        "[Spec→GraphQL] build done. entries={} payloadType={}",
        entries.size(),
        payload == null ? "null" : payload.getNodeType());
    for (int i = 0; i < entries.size(); i++) {
      Result r = entries.get(i);
      log.info(
          "  entry[{}] field='{}' joinKey='{}' writeTo='{}/{}' resultKey='{}' payloadPath='{}' vars={}",
          i, r.entryField(), r.joinKey(), r.writeTo(), r.writeMode(), r.resultKey(), r.payloadPath(), r.variables());
      log.debug("           query={}", r.query());
    }
  }
}
