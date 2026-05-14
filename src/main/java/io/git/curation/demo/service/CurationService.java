package io.git.curation.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.git.curation.demo.domain.Curation;
import io.git.curation.demo.domain.CurationExtension;
import io.git.curation.demo.domain.CurationSpec;
import io.git.curation.demo.global.exception.PayloadValidationException;
import io.git.curation.demo.graphql.SpecGraphQlBuilder;
import io.git.curation.demo.repository.CurationExtensionRepository;
import io.git.curation.demo.repository.CurationRepository;
import io.git.curation.demo.repository.CurationSpecRepository;
import io.git.curation.demo.global.request.CurationCreateRequest;
import io.git.curation.demo.global.response.CurationDetailResponse;
import io.git.curation.demo.global.response.CurationListItem;
import io.git.curation.demo.global.validator.PayloadValidator;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.ExecutionGraphQlRequest;
import org.springframework.graphql.ExecutionGraphQlResponse;
import org.springframework.graphql.ExecutionGraphQlService;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.support.DefaultExecutionGraphQlRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

/**
 * 큐레이션 등록·조회 서비스.
 *
 * <p>조회({@link #detail(Long)}) 흐름:
 * <ol>
 *   <li>responseSpec walk → GraphQL query·variables 빌드 ({@link SpecGraphQlBuilder})
 *   <li>in-process {@code ExecutionGraphQlService.execute()} 로 도메인 hydrate 데이터 조회
 *   <li>payload 와 hydrate 결과 머지 ({@code writeTo}/{@code payloadPath} 분기)
 *   <li>{@link CurationDetailResponse} 로 래핑
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CurationService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String JSON_PATH_ROOT = "$";
    private static final String JSON_PATH_PREFIX = "$.";
    private static final String DEFAULT_CONTAINER = "object";

    private final CurationSpecRepository specRepository;
    private final CurationRepository curationRepository;
    private final CurationExtensionRepository extensionRepository;
    private final PayloadValidator validator;
    private final SpecGraphQlBuilder graphQlBuilder;
    private final ExecutionGraphQlService executionGraphQlService;

    // ============================================================ public API

    @Transactional
    public Long create(CurationCreateRequest request) {
        CurationSpec spec =
                specRepository
                        .findById(request.specId())
                        .orElseThrow(
                                () -> new IllegalArgumentException("스펙을 찾을 수 없음: id=" + request.specId()));

        JsonNode payloadNode = MAPPER.valueToTree(request.payload());

        List<String> errors = validator.validate(spec.getRequestSpec(), payloadNode);
        if (!errors.isEmpty()) {
            throw new PayloadValidationException(errors);
        }

        List<String> imageUrls = normalizeImageUrls(request);

        Curation curation =
                curationRepository.save(
                        Curation.builder()
                                .specId(spec.getId())
                                .name(request.name())
                                .description(request.description())
                                .coverImageUrl(imageUrlAt(imageUrls, 0))
                                .imageUrl2(imageUrlAt(imageUrls, 1))
                                .imageUrl3(imageUrlAt(imageUrls, 2))
                                .exposureStartDate(request.exposureStartDate())
                                .exposureEndDate(request.exposureEndDate())
                                .displayOrder(request.displayOrder())
                                .isActive(request.isActive())
                                .build());

        extensionRepository.save(
                CurationExtension.builder()
                        .curationId(curation.getId())
                        .specId(spec.getId())
                        .payload(payloadNode)
                        .build());

        return curation.getId();
    }

    @Transactional(readOnly = true)
    public List<CurationListItem> list() {
        Map<Long, CurationSpec> specMap = new HashMap<>();
        specRepository.findAll().forEach(s -> specMap.put(s.getId(), s));
        return curationRepository.findAll().stream()
                .map(
                        c -> {
                            CurationSpec s = specMap.get(c.getSpecId());
                            return new CurationListItem(
                                    c.getId(),
                                    c.getSpecId(),
                                    s == null ? null : s.getCode(),
                                    s == null ? null : s.getName(),
                                    c.getName(),
                                    c.getDescription(),
                                    c.getCoverImageUrl(),
                                    c.getImageUrls(),
                                    c.getExposureStartDate(),
                                    c.getExposureEndDate(),
                                    c.getDisplayOrder(),
                                    c.getIsActive(),
                                    c.getCreateAt());
                        })
                .toList();
    }

    private List<String> normalizeImageUrls(CurationCreateRequest request) {
        List<String> raw =
                request.imageUrls() == null || request.imageUrls().isEmpty()
                        ? List.of(request.coverImageUrl())
                        : request.imageUrls();
        return raw.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim)
                .limit(3)
                .toList();
    }

    private String imageUrlAt(List<String> imageUrls, int index) {
        return imageUrls.size() > index ? imageUrls.get(index) : null;
    }

    @Transactional(readOnly = true)
    public CurationDetailResponse detail(Long id) {
        Curation curation =
                curationRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("큐레이션을 찾을 수 없음: id=" + id));
        CurationSpec spec =
                specRepository
                        .findById(curation.getSpecId())
                        .orElseThrow(() -> new IllegalStateException("스펙 누락: id=" + curation.getSpecId()));
        JsonNode payload = extensionRepository.findById(id).map(CurationExtension::getPayload).orElse(null);

        String container = readContainer(spec);
        log.info(
                "[Curation·detail] id={} specCode={} container={} payloadType={}",
                id, spec.getCode(), container, payload == null ? "null" : payload.getNodeType());

        List<SpecGraphQlBuilder.Result> built = graphQlBuilder.build(spec.getResponseSpec(), payload);
        List<Map<String, Object>> executions = executeAll(id, built);
        JsonNode hydrated = hydrateAll(payload, built, executions);

        return wrap(curation, spec, container, hydrated);
    }

    // ============================================================ pipeline steps

    /**
     * 빌드된 진입점들을 in-process GraphQL 엔진으로 실행. 진입점이 없으면 빈 리스트.
     */
    private List<Map<String, Object>> executeAll(Long curationId, List<SpecGraphQlBuilder.Result> built) {
        List<Map<String, Object>> out = new ArrayList<>(built.size());
        for (int i = 0; i < built.size(); i++) {
            out.add(executeOne(curationId, i, built.get(i)));
        }
        return out;
    }

    private Map<String, Object> executeOne(Long curationId, int idx, SpecGraphQlBuilder.Result r) {
        ExecutionGraphQlRequest req =
                new DefaultExecutionGraphQlRequest(
                        r.query(), "Q", r.variables(), Map.of(), "curation-" + curationId + "-" + idx, null);
        ExecutionGraphQlResponse resp = Mono.from(executionGraphQlService.execute(req)).block();
        Map<String, Object> spec0 = resp == null ? Map.of() : resp.getExecutionResult().toSpecification();
        logExecution(idx, r, resp, spec0);
        return spec0;
    }

    private JsonNode hydrateAll(
            JsonNode payload,
            List<SpecGraphQlBuilder.Result> built,
            List<Map<String, Object>> executions) {
        JsonNode current = payload;
        for (int i = 0; i < built.size(); i++) {
            current = applyHydration(current, built.get(i), executions.get(i));
        }
        int before = sizeOf(payload);
        int after = sizeOf(current);
        log.info("  step4·5 merged. payloadSize={} hydratedSize={}", before, after);
        return current;
    }

    // ============================================================ hydration

    /**
     * 한 진입점에 대한 hydrate 결과를 payload(또는 subtree) 에 적용.
     */
    @SuppressWarnings("unchecked")
    private JsonNode applyHydration(
            JsonNode payload, SpecGraphQlBuilder.Result r, Map<String, Object> result) {
        if (payload == null || result == null) {
            return payload;
        }
        if (!(result.get("data") instanceof Map<?, ?> data)) {
            return payload;
        }

        // 단건 응답(alcohol)·배치 응답(alcohols) 모두 List 로 통일
        Object raw = data.get(r.entryField());
        List<?> hydrationList;
        if (raw instanceof List<?> l) {
            hydrationList = l;
        } else if (raw instanceof Map<?, ?> single) {
            hydrationList = List.of(single);
        } else {
            return payload;
        }

        Map<Object, Map<String, Object>> byPk = indexByResultKey(hydrationList, r.resultKey());

        if (JSON_PATH_ROOT.equals(r.payloadPath())) {
            return mergeSubtree(payload, r, byPk);
        }
        JsonNode rootCopy = payload.deepCopy();
        JsonNode sub = SpecGraphQlBuilder.navigate(rootCopy, r.payloadPath());
        JsonNode merged = mergeSubtree(sub, r, byPk);
        if (merged != null) {
            setAtPath(rootCopy, r.payloadPath(), merged);
        }
        return rootCopy;
    }

    @SuppressWarnings("unchecked")
    private Map<Object, Map<String, Object>> indexByResultKey(List<?> list, String resultKey) {
        Map<Object, Map<String, Object>> out = new HashMap<>();
        for (Object o : list) {
            if (o instanceof Map<?, ?> m) {
                Object key = m.get(resultKey);
                if (key != null) {
                    out.put(normalizeKey(key), (Map<String, Object>) m);
                }
            }
        }
        return out;
    }

    private JsonNode mergeSubtree(
            JsonNode sub, SpecGraphQlBuilder.Result r, Map<Object, Map<String, Object>> byPk) {
        if (sub == null) {
            return null;
        }
        if (sub.isArray()) {
            ArrayNode arr = MAPPER.createArrayNode();
            for (JsonNode el : sub) {
                arr.add(mergeElement(el, r, byPk));
            }
            return arr;
        }
        if (sub.isObject()) {
            return mergeElement(sub, r, byPk);
        }
        return sub;
    }

    /**
     * 단일 element 머지.
     *
     * <ul>
     *   <li>{@code writeTo} 있음 → element 의 그 자리에 hydrate 결과 배열 set
     *   <li>{@code writeTo} 없음 → element 자체에 hydrate 결과 키 머지 (기존 키 보존)
     * </ul>
     */
    private JsonNode mergeElement(
            JsonNode source, SpecGraphQlBuilder.Result r, Map<Object, Map<String, Object>> byPk) {
        if (!source.isObject()) {
            return source;
        }
        ObjectNode node = ((ObjectNode) source).deepCopy();
        JsonNode joinNode = node.get(r.joinKey());
        if (joinNode == null || joinNode.isNull()) {
            return node;
        }

        if (r.writeTo() != null) {
            node.set(r.writeTo(), pickHydration(joinNode, byPk, r.writeMode()));
            return node;
        }
        Map<String, Object> hit = byPk.get(normalizeKey(jsonScalar(joinNode)));
        if (hit == null) {
            return node;
        }
        hit.forEach(
                (k, v) -> {
                    if (!node.has(k)) {
                        node.set(k, MAPPER.valueToTree(v));
                    }
                });
        return node;
    }

    /** writeMode=array 면 ArrayNode, single 면 첫 hit 의 ObjectNode (없으면 NullNode). */
    private JsonNode pickHydration(
            JsonNode joinNode,
            Map<Object, Map<String, Object>> byPk,
            String writeMode) {
        if (SpecGraphQlBuilder.WRITE_MODE_SINGLE.equals(writeMode)) {
            Object key = joinNode.isArray()
                    ? (joinNode.isEmpty() ? null : jsonScalar(joinNode.get(0)))
                    : jsonScalar(joinNode);
            Map<String, Object> hit = key == null ? null : byPk.get(normalizeKey(key));
            return hit == null ? MAPPER.nullNode() : MAPPER.valueToTree(hit);
        }
        ArrayNode picked = MAPPER.createArrayNode();
        if (joinNode.isArray()) {
            joinNode.forEach(v -> appendIfHit(picked, byPk, jsonScalar(v)));
        } else {
            appendIfHit(picked, byPk, jsonScalar(joinNode));
        }
        return picked;
    }

    private void appendIfHit(ArrayNode arr, Map<Object, Map<String, Object>> byPk, Object key) {
        Map<String, Object> hit = byPk.get(normalizeKey(key));
        if (hit != null) {
            arr.add(MAPPER.valueToTree(hit));
        }
    }

    // ============================================================ helpers

    private CurationDetailResponse wrap(
            Curation curation, CurationSpec spec, String container, JsonNode hydrated) {
        CurationDetailResponse.SpecMeta specMeta =
                new CurationDetailResponse.SpecMeta(
                        spec.getId(),
                        spec.getCode(),
                        spec.getName(),
                        container,
                        spec.getResponseSpec() == null ? null : spec.getResponseSpec().toString());

        return new CurationDetailResponse(
                curation.getId(),
                curation.getName(),
                curation.getDescription(),
                curation.getCoverImageUrl(),
                curation.getImageUrls(),
                curation.getExposureStartDate(),
                curation.getExposureEndDate(),
                curation.getDisplayOrder(),
                curation.getIsActive(),
                curation.getCreateAt(),
                specMeta,
                hydrated == null ? null : hydrated.toString());
    }

    private String readContainer(CurationSpec spec) {
        JsonNode req = spec.getRequestSpec();
        if (req != null && req.has("x-container")) {
            return req.get("x-container").asText(DEFAULT_CONTAINER);
        }
        return DEFAULT_CONTAINER;
    }

    private void setAtPath(JsonNode root, String path, JsonNode value) {
        String trimmed = stripPathPrefix(path);
        if (trimmed.isEmpty()) {
            return;
        }
        String[] segs = trimmed.split("\\.");
        JsonNode cur = root;
        for (int i = 0; i < segs.length - 1; i++) {
            cur = cur.get(segs[i]);
            if (cur == null) {
                return;
            }
        }
        if (cur instanceof ObjectNode obj) {
            obj.set(segs[segs.length - 1], value);
        }
    }

    private static String stripPathPrefix(String path) {
        if (path.startsWith(JSON_PATH_PREFIX)) {
            return path.substring(2);
        }
        return JSON_PATH_ROOT.equals(path) ? "" : path;
    }

    private static int sizeOf(JsonNode node) {
        if (node == null) {
            return 0;
        }
        return node.isArray() ? node.size() : 1;
    }

    /**
     * {@link Number} 와 GraphQL ID(String) 를 모두 Long 으로 정규화 — payload Long ↔ result String 매칭용.
     */
    private static Object normalizeKey(Object o) {
        if (o instanceof Number n) {
            return n.longValue();
        }
        if (o == null) {
            return null;
        }
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException e) {
            return o.toString();
        }
    }

    private static Object jsonScalar(JsonNode n) {
        if (n.isInt() || n.isLong()) {
            return n.asLong();
        }
        return n.asText();
    }

    private void logExecution(
            int idx, SpecGraphQlBuilder.Result r, ExecutionGraphQlResponse resp, Map<String, Object> spec0) {
        var errs =
                resp == null || resp.getExecutionResult().getErrors() == null
                        ? List.<graphql.GraphQLError>of()
                        : resp.getExecutionResult().getErrors();
        Object dataKeys = spec0.get("data") instanceof Map<?, ?> d ? d.keySet() : "n/a";
        log.info(
                "  step3 execute[{}] entry='{}' errors={} dataKeys={}",
                idx, r.entryField(), errs.size(), dataKeys);
        for (var e : errs) {
            ErrorType type = e.getErrorType() instanceof ErrorType t ? t : null;
            log.warn("    error type={} message={} path={}", type, e.getMessage(), e.getPath());
        }
    }
}
