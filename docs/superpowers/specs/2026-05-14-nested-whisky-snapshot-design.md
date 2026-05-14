# Nested Whisky Snapshot Design

## 목적

큐레이션 payload가 `alcoholId`만 저장하는 현재 구조는 DB에 존재하는 위스키만 안정적으로 노출할 수 있다. 시음회나 페어링 큐레이션에서는 DB에 없는 위스키를 직접 입력해야 할 수 있으므로, 큐레이션 발행 시점의 위스키 노출 데이터를 payload에 스냅샷으로 저장한다.

이 설계는 세 가지 목표를 가진다.

1. DB 위스키와 직접 입력 위스키를 같은 카드 UI로 다룬다.
2. 노출에 필요한 위스키 미러 데이터는 payload 자체에 저장한다.
3. 별점, 리뷰, 찜 같은 DB 기반 데이터는 `alcoholId`가 있을 때만 조회 응답에서 보강한다.

## 확정 결정

- 위스키 카드 단위는 flat 구조가 아니라 nested 구조를 사용한다.
- 저장 payload에는 `source`, `alcohol`, `comment`를 둔다.
- `alcohol` 블록에는 발행 시점의 미러 데이터만 저장한다.
- DB 기반 통계와 활동 데이터는 저장 payload에 넣지 않는다.
- 조회 응답에서만 `stats`, `actions`를 보강한다.
- 직접 입력 위스키는 `source: "MANUAL"`과 `alcohol.alcoholId: null`로 표현한다.
- DB 위스키는 `source: "BOTTLE_NOTE"`와 `alcohol.alcoholId`로 표현한다.
- 태그는 DB 태그 ID를 저장하지 않고 최종 선택 문자열 배열만 저장한다.

## 저장 Payload 계약

공통 위스키 카드 단위:

```json
{
  "source": "BOTTLE_NOTE",
  "alcohol": {
    "alcoholId": 1,
    "korName": "글렌드로낙 오리지널 12년",
    "engName": "GLENDRONACH ORIGINAL 12Y",
    "imageUrl": "https://example.com/whisky.webp",
    "regionName": "스코틀랜드/하이랜드",
    "korCategory": "싱글 몰트",
    "cask": "셰리 캐스크",
    "abv": "43",
    "volume": "700ml",
    "selectedTags": ["셰리", "건포도", "오크"]
  },
  "comment": "셰리 캐스크 입문용으로 추천"
}
```

직접 입력 위스키:

```json
{
  "source": "MANUAL",
  "alcohol": {
    "alcoholId": null,
    "korName": "행사용 샘플 위스키",
    "engName": "Event Sample Whisky",
    "imageUrl": "https://example.com/manual.webp",
    "regionName": "스코틀랜드",
    "korCategory": "싱글 몰트",
    "cask": "버번 캐스크",
    "abv": "46",
    "volume": "30ml",
    "selectedTags": ["스모키", "바닐라"]
  },
  "comment": "현장 제공 샘플이라 직접 입력"
}
```

## 스펙별 적용 형태

추천 위스키:

```json
[
  {
    "source": "BOTTLE_NOTE",
    "alcohol": {},
    "comment": "..."
  }
]
```

위스키 페어링:

```json
[
  {
    "source": "BOTTLE_NOTE",
    "alcohol": {},
    "comment": "...",
    "pairings": [
      {
        "itemName": "부드러운 티라미수 초콜릿",
        "itemImageUrl": "https://example.com/food.webp",
        "pairingNote": "..."
      }
    ]
  }
]
```

위스키 시음회:

```json
{
  "eventDate": "2025-06-15",
  "eventTime": "19:30",
  "barAddress": "서울 강남구 테헤란로 123",
  "detailAddress": "2층 도시남 바",
  "isRecruiting": true,
  "entryFee": 75000,
  "capacity": 20,
  "applicationLink": "https://forms.example.com/tasting",
  "guideText": "시작 10분 전 입장해 주세요.",
  "alcohols": [
    {
      "source": "MANUAL",
      "alcohol": {},
      "comment": "..."
    }
  ]
}
```

## 조회 응답 보강 계약

저장 payload는 변경하지 않고, 상세 조회 응답의 hydrate 결과에만 DB 기반 보강 데이터를 붙인다.

```json
{
  "source": "BOTTLE_NOTE",
  "alcohol": {
    "alcoholId": 1,
    "korName": "글렌드로낙 오리지널 12년",
    "selectedTags": ["셰리", "건포도"]
  },
  "comment": "...",
  "stats": {
    "rating": 4.25,
    "totalRatingsCount": 33,
    "reviewCount": 8,
    "totalPickCount": 217
  },
  "actions": {
    "ratings": [],
    "reviews": [],
    "picks": []
  }
}
```

`alcohol.alcoholId`가 없으면 `stats`와 `actions`는 `null`로 반환한다. UI는 이 경우 별점, 리뷰, 찜 영역을 숨긴다.

## 태그 규칙

- `selectedTags`는 문자열 배열이다.
- DB 태그 ID는 저장하지 않는다.
- DB에서 가져온 태그와 사용자가 직접 추가한 태그는 저장 시점에 같은 문자열로 취급한다.
- 사용자가 DB 기본 태그 10개 중 5개를 삭제하고 직접 태그 1개를 추가하면 payload에는 최종 6개만 저장한다.
- DB 태그가 나중에 삭제되거나 이름이 바뀌어도 큐레이션 노출은 payload의 `selectedTags`를 사용한다.
- 한영 구분은 이 데모 범위에서 다루지 않는다.

## Backend 변경 방향

`SpecGraphQlBuilder`는 기존처럼 responseSpec의 `x-graphql` 메타를 기반으로 DB 보강 쿼리를 만든다. 다만 `argFrom`은 기존 `$.alcoholId`가 아니라 `$.alcohol.alcoholId`를 읽을 수 있어야 한다.

`CurationService`의 hydrate merge는 다음 규칙을 따른다.

- 원본 payload 객체는 보존한다.
- GraphQL 결과는 top-level에 무조건 merge하지 않는다.
- `stats`와 `actions`처럼 spec이 지정한 별도 위치에만 보강 데이터를 쓴다.
- `alcohol.alcoholId`가 null이면 GraphQL 변수에서 제외한다.
- GraphQL 결과가 없어도 저장된 `alcohol` 미러 데이터는 그대로 응답한다.

## Frontend 변경 방향

`alcohol-card` 위젯은 두 입력 모드를 제공한다.

1. DB 검색 선택
   - 기존 alcohol search를 사용한다.
   - 선택 시 alcohol detail을 읽어 `alcohol` 미러 블록을 채운다.
   - 기본 태그 목록을 `selectedTags` 초기값으로 넣는다.
   - 사용자는 태그 삭제와 직접 추가를 할 수 있다.

2. 직접 입력
   - `alcoholId` 없이 이름, 이미지 URL, 지역, 카테고리, 캐스크, 도수, 용량, 태그를 입력한다.
   - 저장 payload는 `source: "MANUAL"`과 `alcohol.alcoholId: null`을 사용한다.

조회 화면은 저장된 `alcohol` 블록을 기준으로 카드 본문을 그린다. `stats/actions`가 있으면 추가 영역을 표시하고, 없으면 숨긴다.

## 데이터와 Seed 변경 방향

`schema.init.sql`의 3개 확정 스펙과 5개 데모 큐레이션 payload를 새 nested 구조로 갱신한다. 초기 데이터에는 DB 위스키와 직접 입력 위스키를 모두 포함해 데모에서 두 경로가 보이게 한다.

권장 데모 구성:

- 추천 위스키: DB 위스키 1개 + 직접 입력 위스키 1개
- 위스키 페어링: DB 위스키 1개 + 직접 입력 위스키 1개
- 시음회: DB 위스키 1개 + 직접 입력 위스키 1개

## 검증 기준

- `schema.sql`과 `schema.init.sql`을 새 DB에 순서대로 적용할 수 있다.
- `POST /api/curations`가 nested payload를 JSON Schema 기준으로 검증한다.
- payload 크기와 반복 항목 수가 과도할 때 등록 요청을 제한하거나 명확한 4xx 오류로 차단한다.
- DB 위스키 선택 항목은 상세 조회에서 `stats/actions`가 보강된다.
- 직접 입력 항목은 상세 조회에서 저장된 미러 데이터만 표시되고 DB 통계 영역이 숨겨진다.
- 태그 삭제/추가 후 저장하면 `selectedTags`에는 최종 문자열 목록만 남는다.
- 기존 3개 스펙의 입력 화면, 보기보드, 모바일 미리보기, 상세 조회 화면이 모두 새 구조를 사용한다.

## Payload Overflow 테스트 시나리오

스펙이 열려 있거나 배열 길이 제한이 없으면 사용자가 지나치게 큰 payload를 만들 수 있다. 이 경우 등록 API, 상세 조회 hydrate, 모바일 미리보기, 브라우저 렌더링에서 네트워크 타임아웃이나 응답 지연이 발생할 수 있으므로 overflow 시나리오를 별도 검증한다.

테스트해야 할 케이스:

- `alcohols` 배열이 허용 개수를 초과하면 JSON Schema 검증에서 실패한다.
- `selectedTags` 배열이 허용 개수를 초과하면 JSON Schema 검증에서 실패한다.
- `comment`, `guideText`, `pairingNote` 같은 긴 텍스트 필드가 허용 길이를 초과하면 등록이 실패한다.
- 이미지 URL 필드가 과도하게 길거나 개수가 늘어나도 저장 payload 크기가 제한된다.
- payload 전체 크기가 정해진 상한을 넘으면 hydrate 실행 전에 4xx 오류로 종료한다.
- overflow 실패 응답은 서버 타임아웃이 아니라 사용자가 이해할 수 있는 검증 오류 메시지를 반환한다.

초기 권장 상한:

- 큐레이션 위스키 카드: 스펙별 최대 10개
- 위스키별 `selectedTags`: 최대 12개
- 위스키별 페어링 음식: 최대 5개
- `comment` / `pairingNote`: 최대 500자
- `guideText`: 최대 1,000자
- payload 전체: 최대 128KB

## 비범위

- 직접 입력 위스키를 `alcohols` 테이블에 저장하지 않는다.
- DB 태그와 `selectedTags`를 동기화하지 않는다.
- 직접 입력 위스키에 별점, 리뷰, 찜 데이터를 생성하지 않는다.
- 이 데모에서는 한글/영문 태그 분리 모델을 만들지 않는다.
