package io.git.curation.demo.hydrator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.repository.AlcoholRepository;
import io.git.curation.demo.repository.RegionRepository;
import io.git.curation.demo.repository.TastingTagRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * payload(JsonNode) 트리 안의 alcoholId / alcoholIds 위치를 alcohol / alcohols 객체로 치환.
 * 응답 payload 자체가 이미 hydrate 된 형태.
 */
@Component
@RequiredArgsConstructor
public class AlcoholHydrator {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final AlcoholRepository alcoholRepository;
  private final RegionRepository regionRepository;
  private final TastingTagRepository tastingTagRepository;

  /** payload 를 hydrate 해서 새 JsonNode 반환 (원본 미변경). */
  public JsonNode hydrate(JsonNode payload) {
    if (payload == null || payload.isNull()) return payload;
    Set<Long> ids = new HashSet<>();
    collectAlcoholIds(payload, ids);
    Map<Long, ObjectNode> details = ids.isEmpty() ? Map.of() : fetchDetails(ids);
    return walk(payload, details);
  }

  // ---------- 트리 walk ----------
  private JsonNode walk(JsonNode node, Map<Long, ObjectNode> details) {
    if (node == null || node.isNull()) return node;
    if (node.isObject()) {
      ObjectNode out = MAPPER.createObjectNode();
      node.fields()
          .forEachRemaining(
              e -> {
                String k = e.getKey();
                JsonNode v = e.getValue();
                if ("alcoholId".equals(k) && v.canConvertToLong()) {
                  ObjectNode detail = details.get(v.asLong());
                  out.set("alcohol", detail != null ? detail : NullNode.instance);
                } else if ("alcoholIds".equals(k) && v.isArray()) {
                  ArrayNode arr = MAPPER.createArrayNode();
                  v.forEach(
                      idn -> {
                        if (idn.canConvertToLong()) {
                          ObjectNode d = details.get(idn.asLong());
                          if (d != null) arr.add(d);
                        }
                      });
                  out.set("alcohols", arr);
                } else {
                  out.set(k, walk(v, details));
                }
              });
      return out;
    }
    if (node.isArray()) {
      ArrayNode out = MAPPER.createArrayNode();
      node.forEach(child -> out.add(walk(child, details)));
      return out;
    }
    return node;
  }

  // ---------- alcoholId 수집 ----------
  private void collectAlcoholIds(JsonNode node, Set<Long> sink) {
    if (node == null || node.isNull()) return;
    if (node.isObject()) {
      node.fields()
          .forEachRemaining(
              e -> {
                String k = e.getKey();
                JsonNode v = e.getValue();
                if ("alcoholId".equals(k) && v.canConvertToLong()) sink.add(v.asLong());
                else if ("alcoholIds".equals(k) && v.isArray())
                  v.forEach(
                      idn -> {
                        if (idn.canConvertToLong()) sink.add(idn.asLong());
                      });
                else collectAlcoholIds(v, sink);
              });
    } else if (node.isArray()) node.forEach(child -> collectAlcoholIds(child, sink));
  }

  // ---------- 마스터 + region + tags 조합 ----------
  private Map<Long, ObjectNode> fetchDetails(Set<Long> ids) {
    List<Alcohol> alcohols = alcoholRepository.findAllById(ids);
    Set<Long> regionIds = new HashSet<>();
    alcohols.forEach(a -> { if (a.getRegionId() != null) regionIds.add(a.getRegionId()); });
    Map<Long, String> regionName = new HashMap<>();
    regionRepository.findAllById(regionIds).forEach(r -> regionName.put(r.getId(), r.getKorName()));

    Map<Long, ObjectNode> result = new HashMap<>();
    for (Alcohol a : alcohols) {
      ObjectNode n = MAPPER.createObjectNode();
      n.put("alcoholId", a.getId());
      n.put("korName", a.getKorName());
      n.put("engName", a.getEngName());
      n.put("imageUrl", a.getImageUrl());
      n.put("regionName", a.getRegionId() == null ? null : regionName.get(a.getRegionId()));
      n.put("korCategory", a.getKorCategory());
      n.put("engCategory", a.getEngCategory());
      n.put("cask", a.getCask());
      n.put("abv", a.getAbv());
      n.put("volume", a.getVolume());
      ArrayNode tags = MAPPER.createArrayNode();
      tastingTagRepository
          .findByAlcoholIdRaw(a.getId())
          .forEach(
              row -> {
                ObjectNode t = MAPPER.createObjectNode();
                t.put("id", ((Number) row[0]).longValue());
                t.put("korName", (String) row[1]);
                t.put("engName", (String) row[2]);
                tags.add(t);
              });
      n.set("tags", tags);
      result.put(a.getId(), n);
    }
    return result;
  }
}
