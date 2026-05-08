package io.git.curation.demo.global.converter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class JsonNodeConverter implements AttributeConverter<JsonNode, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(JsonNode attribute) {
    if (attribute == null) return null;
    try {
      return MAPPER.writeValueAsString(attribute);
    } catch (Exception e) {
      throw new IllegalStateException("JsonNode → JSON 직렬화 실패", e);
    }
  }

  @Override
  public JsonNode convertToEntityAttribute(String dbData) {
    if (dbData == null) return null;
    try {
      return MAPPER.readTree(dbData);
    } catch (Exception e) {
      throw new IllegalStateException("JSON → JsonNode 역직렬화 실패", e);
    }
  }
}
