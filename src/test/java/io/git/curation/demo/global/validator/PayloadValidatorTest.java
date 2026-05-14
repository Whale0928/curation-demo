package io.git.curation.demo.global.validator;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PayloadValidatorTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final PayloadValidator validator = new PayloadValidator();

  @Test
  @DisplayName("selectedTags가 12개를 초과하면 검증 오류를 반환한다")
  void validate_whenSelectedTagsOverflow_returnsError() throws Exception {
    JsonNode schema =
        mapper.readTree(
            """
            {
              "type": "object",
              "properties": {
                "source": { "type": "string" },
                "alcohol": {
                  "type": "object",
                  "properties": {
                    "selectedTags": {
                      "type": "array",
                      "maxItems": 12,
                      "items": { "type": "string", "minLength": 1, "maxLength": 30 }
                    }
                  },
                  "required": ["selectedTags"]
                }
              },
              "required": ["source", "alcohol"]
            }
            """);
    ObjectNode payload = mapper.createObjectNode();
    payload.put("source", "MANUAL");
    ObjectNode alcohol = payload.putObject("alcohol");
    ArrayNode tags = alcohol.putArray("selectedTags");
    for (int i = 0; i < 13; i++) {
      tags.add("태그" + i);
    }

    List<String> errors = validator.validate(schema, payload);

    assertThat(errors)
        .anySatisfy(
            error -> {
              assertThat(error).contains("selectedTags");
              assertThat(error).contains("12");
            });
  }

  @Test
  @DisplayName("payload 전체 크기가 128KB를 초과하면 검증 오류를 반환한다")
  void validate_whenPayloadBytesOverflow_returnsError() {
    ObjectNode schema = mapper.createObjectNode();
    schema.put("type", "object");
    ObjectNode payload = mapper.createObjectNode();
    payload.put("comment", "x".repeat(129 * 1024));

    List<String> errors = validator.validate(schema, payload);

    assertThat(errors).anySatisfy(error -> assertThat(error).contains("payload size"));
  }
}
