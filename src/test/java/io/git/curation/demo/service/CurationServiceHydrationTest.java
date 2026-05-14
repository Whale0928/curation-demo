package io.git.curation.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.git.curation.demo.global.request.CurationCreateRequest;
import io.git.curation.demo.graphql.SpecGraphQlBuilder;
import java.time.LocalDate;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CurationServiceHydrationTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void normalizeImageUrls_whenOnlyCoverImageProvided_usesOneImage() throws Exception {
    CurationService service = new CurationService(null, null, null, null, null, null);
    CurationCreateRequest request =
        requestWithImages("https://example.com/default.jpg", List.of());
    Method method =
        CurationService.class.getDeclaredMethod("normalizeImageUrls", CurationCreateRequest.class);
    method.setAccessible(true);

    @SuppressWarnings("unchecked")
    List<String> images = (List<String>) method.invoke(service, request);

    assertThat(images).containsExactly("https://example.com/default.jpg");
  }

  @Test
  void normalizeImageUrls_whenNoImageProvided_throwsException() throws Exception {
    CurationService service = new CurationService(null, null, null, null, null, null);
    CurationCreateRequest request = requestWithImages(null, List.of(" "));
    Method method =
        CurationService.class.getDeclaredMethod("normalizeImageUrls", CurationCreateRequest.class);
    method.setAccessible(true);

    assertThatThrownBy(() -> method.invoke(service, request))
        .hasRootCauseInstanceOf(IllegalArgumentException.class)
        .hasRootCauseMessage("이미지는 최소 1장 이상 필요합니다.");
  }

  @Test
  void applyHydration_whenNestedCards_mixDbAndManual_writesStatsOnly() throws Exception {
    CurationService service = new CurationService(null, null, null, null, null, null);
    JsonNode payload =
        mapper.readTree(
            """
            [
              {
                "source": "BOTTLE_NOTE",
                "alcohol": { "alcoholId": 1, "korName": "A", "selectedTags": ["셰리"] },
                "comment": "known"
              },
              {
                "source": "MANUAL",
                "alcohol": { "alcoholId": null, "korName": "B", "selectedTags": ["스모키"] },
                "comment": "manual"
              }
            ]
            """);
    SpecGraphQlBuilder.Result result =
        new SpecGraphQlBuilder.Result(
            "query",
            Map.of("ids", List.of(1)),
            "alcohols",
            "alcoholId",
            "$.alcohol.alcoholId",
            "stats",
            SpecGraphQlBuilder.WRITE_MODE_SINGLE,
            "alcoholId",
            "$");
    Map<String, Object> graphQlResult =
        Map.of(
            "data",
            Map.of(
                "alcohols",
                List.of(
                    Map.of(
                        "alcoholId",
                        "1",
                        "rating",
                        4.25,
                        "totalPickCount",
                        10))));

    Method method =
        CurationService.class.getDeclaredMethod(
            "applyHydration", JsonNode.class, SpecGraphQlBuilder.Result.class, Map.class);
    method.setAccessible(true);

    JsonNode hydrated = (JsonNode) method.invoke(service, payload, result, graphQlResult);

    assertThat(hydrated.get(0).path("alcohol").path("korName").asText()).isEqualTo("A");
    assertThat(hydrated.get(0).path("stats").path("rating").asDouble()).isEqualTo(4.25);
    assertThat(hydrated.get(0).path("stats").has("alcoholId")).isFalse();
    assertThat(hydrated.get(1).path("alcohol").path("korName").asText()).isEqualTo("B");
    assertThat(hydrated.get(1).get("stats").isNull()).isTrue();
    assertThat(hydrated.get(1).has("actions")).isFalse();
  }

  private CurationCreateRequest requestWithImages(String coverImageUrl, List<String> imageUrls) {
    return new CurationCreateRequest(
        1L,
        "name",
        "description",
        coverImageUrl,
        imageUrls,
        LocalDate.of(2025, 6, 5),
        LocalDate.of(2025, 6, 10),
        0,
        true,
        Map.of("source", "MANUAL"));
  }
}
