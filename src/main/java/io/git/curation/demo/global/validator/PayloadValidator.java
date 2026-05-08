package io.git.curation.demo.global.validator;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/** OpenAPI Schema(JSON Schema Draft 7 호환) 기반 payload 검증기. */
@Component
public class PayloadValidator {

  private final JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);

  public List<String> validate(JsonNode requestSpec, JsonNode payload) {
    if (requestSpec == null) {
      return List.of("스펙의 requestSpec 이 없음");
    }
    if (payload == null) {
      return List.of("payload 가 null");
    }
    JsonSchema schema = factory.getSchema(requestSpec);

    // 배열이면 각 요소를 단일 schema 로 검증 (container=array 큐레이션)
    if (payload.isArray()) {
      List<String> errs = new java.util.ArrayList<>();
      if (payload.isEmpty()) errs.add("payload 배열이 비어있음");
      for (int i = 0; i < payload.size(); i++) {
        Set<ValidationMessage> ve = schema.validate(payload.get(i));
        for (ValidationMessage v : ve) errs.add("[" + i + "] " + v.getMessage());
      }
      return errs;
    }

    Set<ValidationMessage> errors = schema.validate(payload);
    return errors.stream().map(ValidationMessage::getMessage).toList();
  }
}
