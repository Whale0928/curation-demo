package io.git.curation.demo.hydrator;

import com.fasterxml.jackson.databind.JsonNode;
import io.git.curation.demo.domain.Alcohol;
import io.git.curation.demo.domain.Region;
import io.git.curation.demo.repository.AlcoholRepository;
import io.git.curation.demo.repository.RegionRepository;
import io.git.curation.demo.repository.TastingTagRepository;
import io.git.curation.demo.response.AlcoholDetailResponse;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * payload 안의 모든 alcoholId 를 재귀 추출해 alcohol 마스터 + region + tags 로 hydrate.
 * 응답에 {id → AlcoholDetailResponse} 매핑 형태로 동봉.
 */
@Component
@RequiredArgsConstructor
public class AlcoholHydrator {

  private final AlcoholRepository alcoholRepository;
  private final RegionRepository regionRepository;
  private final TastingTagRepository tastingTagRepository;

  public Map<Long, AlcoholDetailResponse> hydrate(JsonNode payload) {
    Set<Long> ids = new HashSet<>();
    collectAlcoholIds(payload, ids);
    if (ids.isEmpty()) return Map.of();

    List<Alcohol> alcohols = alcoholRepository.findAllById(ids);
    Set<Long> regionIds = new HashSet<>();
    alcohols.forEach(a -> { if (a.getRegionId() != null) regionIds.add(a.getRegionId()); });
    Map<Long, String> regionName = new HashMap<>();
    regionRepository.findAllById(regionIds).forEach(r -> regionName.put(r.getId(), r.getKorName()));

    Map<Long, AlcoholDetailResponse> result = new LinkedHashMap<>();
    for (Alcohol a : alcohols) {
      List<AlcoholDetailResponse.TagItem> tags =
          tastingTagRepository.findByAlcoholIdRaw(a.getId()).stream()
              .map(
                  row ->
                      new AlcoholDetailResponse.TagItem(
                          ((Number) row[0]).longValue(),
                          (String) row[1],
                          (String) row[2]))
              .toList();
      result.put(
          a.getId(),
          new AlcoholDetailResponse(
              a.getId(),
              a.getKorName(),
              a.getEngName(),
              a.getImageUrl(),
              a.getRegionId() == null ? null : regionName.get(a.getRegionId()),
              a.getKorCategory(),
              a.getEngCategory(),
              a.getCask(),
              a.getAbv(),
              a.getVolume(),
              tags));
    }
    return result;
  }

  /** payload(JsonNode) 트리에서 키가 "alcoholId"/"alcoholIds" 인 모든 숫자값을 수집. */
  private void collectAlcoholIds(JsonNode node, Set<Long> sink) {
    if (node == null || node.isNull()) return;
    if (node.isObject()) {
      node.fields()
          .forEachRemaining(
              e -> {
                String k = e.getKey();
                JsonNode v = e.getValue();
                if ("alcoholId".equals(k) && v.canConvertToLong()) {
                  sink.add(v.asLong());
                } else if ("alcoholIds".equals(k) && v.isArray()) {
                  v.forEach(idn -> { if (idn.canConvertToLong()) sink.add(idn.asLong()); });
                } else {
                  collectAlcoholIds(v, sink);
                }
              });
    } else if (node.isArray()) {
      node.forEach(child -> collectAlcoholIds(child, sink));
    }
  }
}
