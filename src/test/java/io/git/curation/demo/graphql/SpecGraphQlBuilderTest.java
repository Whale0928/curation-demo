package io.git.curation.demo.graphql;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class SpecGraphQlBuilderTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final SpecGraphQlBuilder builder = new SpecGraphQlBuilder();

  @Test
  void build_whenNestedAlcoholIdContainsNull_filtersNullIds() throws Exception {
    JsonNode responseSpec =
        mapper.readTree(
            """
            {
              "type": "object",
              "properties": {
                "stats": {
                  "type": "object",
                  "x-graphql": {
                    "query": "alcohols",
                    "argFrom": "$.alcohol.alcoholId",
                    "argName": "ids",
                    "argType": "[ID!]!",
                    "writeTo": "stats"
                  },
                  "properties": {
                    "rating": { "type": "number", "x-graphql": true }
                  }
                }
              }
            }
            """);
    JsonNode payload =
        mapper.readTree(
            """
            [
              { "source": "BOTTLE_NOTE", "alcohol": { "alcoholId": 1, "korName": "A", "selectedTags": [] } },
              { "source": "MANUAL", "alcohol": { "alcoholId": null, "korName": "B", "selectedTags": [] } }
            ]
            """);

    List<SpecGraphQlBuilder.Result> result = builder.build(responseSpec, payload);

    assertThat(result).hasSize(1);
    assertThat(result.getFirst().variables().get("ids")).isEqualTo(List.of(1));
    assertThat(result.getFirst().joinKey()).isEqualTo("alcoholId");
    assertThat(result.getFirst().joinPath()).isEqualTo("$.alcohol.alcoholId");
  }
}
