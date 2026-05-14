# Nested Whisky Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DB 위스키와 직접 입력 위스키를 동일한 nested payload 카드로 저장하고, payload overflow를 spec과 서버에서 검증한다.

**Architecture:** 저장 payload는 `source + alcohol + comment` 구조를 사용하고, `alcohol.selectedTags`는 문자열 배열로 저장한다. 조회 시 `alcohol.alcoholId`가 있는 항목만 GraphQL hydrate로 `stats/actions`를 보강하고, 수동 입력 항목은 저장된 미러 데이터만 노출한다.

**Tech Stack:** Java 21, Spring Boot, Spring GraphQL, networknt JSON Schema validator, Jackson `JsonNode`, vanilla JS static frontend, MySQL seed SQL.

---

## File Map

- Modify: `spec/recommended_whisky.json` — 추천 위스키 request/response schema를 nested card array로 변경하고 `maxItems/maxLength` 제한 추가.
- Modify: `spec/whisky_pairing.json` — 페어링 스펙을 nested card + `pairings.maxItems` 구조로 변경.
- Modify: `spec/whisky_tasting_event.json` — 시음회 `alcohols[]`를 nested card로 변경하고 이벤트 텍스트 제한 추가.
- Modify: `src/main/java/io/git/curation/demo/global/validator/PayloadValidator.java` — payload 전체 128KB 제한 추가.
- Modify: `src/main/java/io/git/curation/demo/graphql/SpecGraphQlBuilder.java` — `$.alcohol.alcoholId` 추출과 null ID 필터링 지원.
- Modify: `src/main/java/io/git/curation/demo/service/CurationService.java` — hydrate 결과를 원본 payload에 덮어쓰지 않고 `stats/actions`로 보강.
- Modify: `display/js/widgets/alcohol-card.js` — DB 선택/직접 입력 모드, selectedTags 편집, nested value 반환.
- Modify: `display/js/widgets/alcohol-card-list.js` — nested card 배열 처리.
- Modify: `display/js/curation-new.js` — nested card preview/save 처리.
- Modify: `display/js/curation-detail.js` — nested card readOnly 렌더링과 stats/actions 조건부 표시.
- Modify: `display/js/mobile-preview.js` — nested card 기반 모바일 미리보기.
- Modify: `display/js/styles.js` — view layout 필드명을 nested 구조에 맞춤.
- Modify: `schema.init.sql` — `curation_spec` JSON과 데모 payload 5건을 nested 구조로 갱신.
- Test: `src/test/java/io/git/curation/demo/global/validator/PayloadValidatorTest.java` — overflow와 schema 제한 검증.
- Test: `src/test/java/io/git/curation/demo/graphql/SpecGraphQlBuilderTest.java` — nested alcoholId 추출과 null 필터 검증.
- Test: `src/test/java/io/git/curation/demo/service/CurationServiceHydrationTest.java` — 수동 위스키는 stats/actions null, DB 위스키는 보강되는지 검증.

---

### Task 1: JSON Schema 제한과 Payload 전체 크기 검증

**Files:**
- Modify: `spec/recommended_whisky.json`
- Modify: `spec/whisky_pairing.json`
- Modify: `spec/whisky_tasting_event.json`
- Modify: `src/main/java/io/git/curation/demo/global/validator/PayloadValidator.java`
- Test: `src/test/java/io/git/curation/demo/global/validator/PayloadValidatorTest.java`

- [ ] **Step 1: Add failing tests for overflow validation**

Create `src/test/java/io/git/curation/demo/global/validator/PayloadValidatorTest.java`:

```java
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
    JsonNode schema = mapper.readTree("""
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

    assertThat(errors).anySatisfy(error -> assertThat(error).contains("maxItems"));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
./gradlew test --tests io.git.curation.demo.global.validator.PayloadValidatorTest
```

Expected: fails because `PayloadValidator` does not yet enforce total payload byte size.

- [ ] **Step 3: Add payload byte limit in `PayloadValidator`**

Modify `src/main/java/io/git/curation/demo/global/validator/PayloadValidator.java` so `validate` prepends a byte-size check:

```java
private static final int MAX_PAYLOAD_BYTES = 128 * 1024;

public List<String> validate(JsonNode schema, JsonNode payload) {
  List<String> errors = new ArrayList<>();
  int payloadBytes = payload == null ? 0 : payload.toString().getBytes(StandardCharsets.UTF_8).length;
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    errors.add("payload size must be <= 131072 bytes, actual=" + payloadBytes);
    return errors;
  }
  // existing JSON Schema validation follows
}
```

Required imports:

```java
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
```

- [ ] **Step 4: Add spec-level limits**

Update all three spec files with these limits:

```json
"maxItems": 10
```

on every whisky card array. Add:

```json
"maxItems": 12,
"items": { "type": "string", "minLength": 1, "maxLength": 30 }
```

to `alcohol.selectedTags`. Add:

```json
"maxLength": 500
```

to `comment` and `pairingNote`. Add:

```json
"maxItems": 5
```

to `pairings`. Add:

```json
"maxLength": 1000
```

to `guideText`. Add:

```json
"maxLength": 2048
```

to every image URL field inside payload schemas.

- [ ] **Step 5: Run validator test**

Run:

```bash
./gradlew test --tests io.git.curation.demo.global.validator.PayloadValidatorTest
```

Expected: PASS.

---

### Task 2: Nested Spec Contract

**Files:**
- Modify: `spec/recommended_whisky.json`
- Modify: `spec/whisky_pairing.json`
- Modify: `spec/whisky_tasting_event.json`

- [ ] **Step 1: Replace flat alcohol request object with nested card object**

Use this object as the request schema unit in all three specs:

```json
{
  "type": "object",
  "description": "큐레이션 위스키 카드",
  "x-field-style": "alcohol-card",
  "x-display-name": "위스키",
  "properties": {
    "source": {
      "type": "string",
      "enum": ["BOTTLE_NOTE", "MANUAL"],
      "description": "위스키 데이터 출처"
    },
    "alcohol": {
      "type": "object",
      "properties": {
        "alcoholId": { "type": "integer", "format": "int64", "nullable": true },
        "korName": { "type": "string", "minLength": 1, "maxLength": 100 },
        "engName": { "type": "string", "maxLength": 150 },
        "imageUrl": { "type": "string", "maxLength": 2048 },
        "regionName": { "type": "string", "maxLength": 80 },
        "korCategory": { "type": "string", "maxLength": 80 },
        "cask": { "type": "string", "maxLength": 120 },
        "abv": { "type": "string", "maxLength": 20 },
        "volume": { "type": "string", "maxLength": 20 },
        "selectedTags": {
          "type": "array",
          "maxItems": 12,
          "items": { "type": "string", "minLength": 1, "maxLength": 30 }
        }
      },
      "required": ["korName", "selectedTags"]
    },
    "comment": {
      "type": "string",
      "maxLength": 500,
      "x-field-style": "long-text",
      "x-display-name": "큐레이터 코멘트"
    }
  },
  "required": ["source", "alcohol"]
}
```

- [ ] **Step 2: Replace response schema unit with nested card plus nullable enrichments**

Use this response schema unit:

```json
{
  "type": "object",
  "description": "큐레이션 위스키 카드 조회 응답",
  "x-field-style": "alcohol-card",
  "x-display-name": "위스키",
  "x-graphql": {
    "query": "alcohols",
    "argFrom": "$.alcohol.alcoholId",
    "argName": "ids",
    "argType": "[ID!]!",
    "writeTo": "stats",
    "resultKey": "alcoholId"
  },
  "properties": {
    "source": { "type": "string" },
    "alcohol": { "type": "object" },
    "comment": { "type": "string" },
    "stats": {
      "type": "object",
      "nullable": true,
      "properties": {
        "rating": { "type": "number", "x-graphql": true },
        "totalRatingsCount": { "type": "integer", "x-graphql": true },
        "reviewCount": { "type": "integer", "x-graphql": true },
        "totalPickCount": { "type": "integer", "x-graphql": true }
      }
    }
  },
  "required": ["source", "alcohol"]
}
```

- [ ] **Step 3: Apply array limits per spec**

Set the top-level array schemas:

```json
"minItems": 1,
"maxItems": 10
```

For `WhiskyPairingItemRequest.pairings`, set:

```json
"minItems": 1,
"maxItems": 5
```

For `WhiskyTastingEventRequest.guideText`, set:

```json
"maxLength": 1000
```

- [ ] **Step 4: Validate JSON syntax**

Run:

```bash
node -e "for (const f of ['spec/recommended_whisky.json','spec/whisky_pairing.json','spec/whisky_tasting_event.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('spec json ok')"
```

Expected: `spec json ok`.

---

### Task 3: GraphQL Nested ID Extraction

**Files:**
- Modify: `src/main/java/io/git/curation/demo/graphql/SpecGraphQlBuilder.java`
- Test: `src/test/java/io/git/curation/demo/graphql/SpecGraphQlBuilderTest.java`

- [ ] **Step 1: Add failing nested extraction test**

Create `src/test/java/io/git/curation/demo/graphql/SpecGraphQlBuilderTest.java`:

```java
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
    JsonNode responseSpec = mapper.readTree("""
        {
          "type": "array",
          "x-graphql": {
            "query": "alcohols",
            "argFrom": "$.alcohol.alcoholId",
            "argName": "ids",
            "argType": "[ID!]!",
            "writeTo": "stats"
          },
          "items": {
            "type": "object",
            "properties": {
              "stats": {
                "type": "object",
                "properties": {
                  "rating": { "type": "number", "x-graphql": true }
                }
              }
            }
          }
        }
        """);
    JsonNode payload = mapper.readTree("""
        [
          { "source": "BOTTLE_NOTE", "alcohol": { "alcoholId": 1, "korName": "A", "selectedTags": [] } },
          { "source": "MANUAL", "alcohol": { "alcoholId": null, "korName": "B", "selectedTags": [] } }
        ]
        """);

    List<SpecGraphQlBuilder.Result> result = builder.build(responseSpec, payload);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).variables().get("ids")).isEqualTo(List.of(1));
    assertThat(result.get(0).joinKey()).isEqualTo("alcoholId");
  }
}
```

- [ ] **Step 2: Run test to verify it fails or exposes current behavior**

Run:

```bash
./gradlew test --tests io.git.curation.demo.graphql.SpecGraphQlBuilderTest
```

Expected before implementation: FAIL if null is not filtered from nested path or joinKey path handling is insufficient.

- [ ] **Step 3: Update `SpecGraphQlBuilder` path handling**

Change `lastSegment("$.alcohol.alcoholId")` to keep join key as `alcohol.alcoholId` or add a new `joinPath` field to `Result`. Prefer adding `joinPath` while preserving `joinKey` for result matching:

```java
public record Result(
    String query,
    Map<String, Object> variables,
    String entryField,
    String joinKey,
    String joinPath,
    String writeTo,
    String writeMode,
    String resultKey,
    String payloadPath) {}
```

Set:

```java
String joinPath = argFrom;
String joinKey = lastSegment(argFrom);
```

Ensure `extractArg` removes null values from arrays after nested extraction.

- [ ] **Step 4: Run builder test**

Run:

```bash
./gradlew test --tests io.git.curation.demo.graphql.SpecGraphQlBuilderTest
```

Expected: PASS.

---

### Task 4: Hydrate Merge to `stats/actions`

**Files:**
- Modify: `src/main/java/io/git/curation/demo/service/CurationService.java`
- Test: `src/test/java/io/git/curation/demo/service/CurationServiceHydrationTest.java`

- [ ] **Step 1: Add unit-level merge tests around nested payload**

Create a focused test that invokes merge behavior through a package-visible helper or reflection. Expected DB item:

```json
{
  "source": "BOTTLE_NOTE",
  "alcohol": { "alcoholId": 1, "korName": "A", "selectedTags": ["셰리"] },
  "comment": "known",
  "stats": { "rating": 4.25, "totalPickCount": 10 }
}
```

Expected manual item:

```json
{
  "source": "MANUAL",
  "alcohol": { "alcoholId": null, "korName": "B", "selectedTags": ["스모키"] },
  "comment": "manual",
  "stats": null,
  "actions": null
}
```

- [ ] **Step 2: Update merge lookup to read nested join path**

In `CurationService.mergeElement`, replace:

```java
JsonNode joinNode = node.get(r.joinKey());
```

with:

```java
JsonNode joinNode = SpecGraphQlBuilder.navigate(node, r.joinPath());
```

If join node is null, set nullable enrichment targets:

```java
if (r.writeTo() != null && !node.has(r.writeTo())) {
  node.set(r.writeTo(), MAPPER.nullNode());
}
```

- [ ] **Step 3: Keep mirror data immutable**

Do not merge GraphQL fields into `alcohol`. Only write to `stats` or `actions` when `writeTo` is present. Existing fields under `alcohol` must remain unchanged.

- [ ] **Step 4: Run service test**

Run:

```bash
./gradlew test --tests io.git.curation.demo.service.CurationServiceHydrationTest
```

Expected: PASS.

---

### Task 5: Frontend Nested Alcohol Card

**Files:**
- Modify: `display/js/widgets/alcohol-card.js`
- Modify: `display/js/widgets/alcohol-card-list.js`
- Modify: `display/js/curation-new.js`
- Modify: `display/js/curation-detail.js`
- Modify: `display/js/mobile-preview.js`
- Modify: `display/js/styles.js`

- [ ] **Step 1: Change `alcohol-card` value contract**

`getValue()` must return:

```js
{
  source: alcoholId == null ? 'MANUAL' : 'BOTTLE_NOTE',
  alcohol: {
    alcoholId,
    korName,
    engName,
    imageUrl,
    regionName,
    korCategory,
    cask,
    abv,
    volume,
    selectedTags
  },
  comment
}
```

- [ ] **Step 2: Add direct input mode**

Add a segmented control with two modes:

```html
<button type="button">DB 검색</button>
<button type="button">직접 입력</button>
```

Manual mode shows inputs for `korName`, `engName`, `imageUrl`, `regionName`, `korCategory`, `cask`, `abv`, `volume`, `selectedTags`.

- [ ] **Step 3: Add selectedTags editor**

Render selected tags as removable chips and an input for adding a new tag. Enforce max 12 in the UI and keep final state only:

```js
function addTag(name) {
  const normalized = name.trim();
  if (!normalized || selectedTags.includes(normalized) || selectedTags.length >= 12) return;
  selectedTags.push(normalized);
  renderTags();
  onChange?.();
}
```

- [ ] **Step 4: Update list/detail/mobile adapters**

Remove all assumptions that a card has top-level `alcoholId`, `korName`, or `tags`. Read from `card.alcohol.alcoholId`, `card.alcohol.korName`, and `card.alcohol.selectedTags`.

- [ ] **Step 5: Manual browser check**

Run static FE:

```bash
python3 -m http.server 25173 --directory display
```

Open `http://localhost:25173/curation-new.html`, select each of the 3 specs, and verify DB search/manual input both produce nested preview.

---

### Task 6: Seed SQL and Runtime Verification

**Files:**
- Modify: `schema.init.sql`
- Modify: `README.md`

- [ ] **Step 1: Regenerate `schema.init.sql` spec JSON from `spec/*.json`**

Ensure `INSERT INTO curation_spec` contains the updated nested request/response specs.

- [ ] **Step 2: Rewrite demo curation payloads**

Each of the 5 demo curation payloads must use nested card objects. Include at least one `MANUAL` whisky item across the demo data:

```json
{
  "source": "MANUAL",
  "alcohol": {
    "alcoholId": null,
    "korName": "행사용 샘플 위스키",
    "selectedTags": ["스모키", "바닐라"]
  },
  "comment": "직접 입력 위스키"
}
```

- [ ] **Step 3: Reload local DB**

Run:

```bash
docker exec -i mysql mysql -u bottle_note -pbottle_note_1234 --default-character-set=utf8mb4 bottle_note < schema.sql
docker exec -i mysql mysql -u bottle_note -pbottle_note_1234 --default-character-set=utf8mb4 bottle_note < schema.init.sql
```

Expected counts include `curation_spec=3`, `curation=5`, `curation_extension=5`.

- [ ] **Step 4: Run backend verification**

Run:

```bash
./gradlew test
curl -s -o /tmp/curations.json -w '%{http_code}\n' http://localhost:20081/api/curations
curl -s -o /tmp/curation-detail.json -w '%{http_code}\n' http://localhost:20081/api/curations/1
```

Expected: tests pass, both curl calls return `200`.

- [ ] **Step 5: Update README contract note**

Add a short note that curation alcohol payloads use nested snapshot structure and that overflow is guarded by JSON Schema plus 128KB server limit.

---

## Self Review

- Spec coverage: nested payload, selectedTags string array, manual whisky, stats/actions response-only, payload overflow, and seed SQL are covered by Tasks 1-6.
- Placeholder scan: no `TBD` or `TODO` remains in this plan.
- Type consistency: the plan uses `source`, `alcohol`, `alcohol.alcoholId`, `alcohol.selectedTags`, `stats`, and `actions` consistently.
