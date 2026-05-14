/**
 * 폼/필드 패턴 카탈로그.
 * spec.json 에는 키만 박히고, 그 키가 가리키는 표현 디테일이 여기에 있다.
 *
 * - x-form-style  → FORM_STYLES[key]   : 큐레이션 전체 모양
 * - x-field-style → FIELD_STYLES[key]  : 한 필드 입력 모양
 *
 * 새 모드 추가 = 여기 항목 + (필요시) css/styles/*.css 추가만.
 */

// 폼 패턴 (root, container 와 cardMode/layout/rootWidget 결정)
export const FORM_STYLES = {
  // 위스키 카드 N개. 각 카드 = 풍부 알코올 카드 + 코멘트
  'alcohol-list': {
    cardMode:     'rich-with-comment',
    cardWidget:   'alcohol-card',     // 카드 본문 위젯 키
    commentField: 'comment',          // 카드 하단 코멘트 textarea 가 쓸 properties 의 키
    addLabel:     '+ 위스키 추가',
    cssClass:     'fs-alcohol-list',
  },

  // 페어링 조합 N개. 각 조합 = 위스키 1개 + 페어링 음식 N개
  'pairing-list': {
    cardMode:  'object-form',
    addLabel:  '+ 페어링 조합 추가',
    cssClass:  'fs-pairing-list',
    layout: {
      groups: [
        { title: '위스키', rows: [['alcoholId'], ['comment']] },
        { title: '위스키와 페어링할 음식', rows: [['pairings']] },
      ],
    },
    viewLayout: {
      groups: [
        { title: '위스키', rows: [['alcoholId', 'korName', 'engName', 'rating'], ['imageUrl', 'comment']] },
        { title: '페어링 음식', rows: [['pairings']] },
      ],
    },
  },

  // 위스키 ↔ 음식 N:N 매트릭스. root 단일 위젯이 스펙 전체 차지
  'pairing-matrix': {
    cardMode:    'root-widget',
    rootWidget:  'pairing-matrix',
    cssClass:    'fs-pairing-matrix',
  },

  // 알코올 1건 프로파일 — 큐레이터 한 줄 + alcohol 마스터 + picks/ratings/reviews 풀 hydrate
  'alcohol-profile': {
    cardMode: 'object-form-single',
    cssClass: 'fs-alcohol-profile',
    layout: {
      groups: [
        { title: '대상 알코올',  rows: [['alcoholId']] },
        { title: '큐레이터 한 줄', rows: [['headline']] },
      ],
    },
    viewLayout: {
      groups: [
        { title: '큐레이터 한 줄', rows: [['headline']] },
        { title: '알코올',        rows: [['alcohol']] },
      ],
    },
  },

  // 시음회 1회차 (단일 객체 폼)
  'tasting-form': {
    cardMode:  'object-form-single',
    cssClass:  'fs-tasting-form',
    layout: {
      groups: [
        { title: '날짜 및 장소',
          rows: [['eventDate', 'eventTime'], ['barAddress'], ['detailAddress']] },
        { title: '참가 정보',
          rows: [['isRecruiting'], ['entryFee', 'capacity'], ['applicationLink'], ['guideText']] },
        { title: '시음 위스키',
          rows: [['alcohols']] },
      ],
    },
  },
};

// 필드 패턴 (property 단위, 위젯과 동작 모드 결정)
// widget: null 인 경우 detail viewer 가 type 에 따라 input/textarea fallback 처리.
export const FIELD_STYLES = {
  // 알코올 도메인 위젯
  'alcohol-search-multi':  { widget: 'alcohol-search', mode: 'multi' },
  'alcohol-search-single': { widget: 'alcohol-search', mode: 'single' },
  'alcohol-card':          { widget: 'alcohol-card' },
  'alcohol-card-list':     { widget: 'alcohol-card-list' },
  'pairing-food-list':     { widget: 'pairing-food-list' },

  // 일반 입력 위젯
  'notes-list':   { widget: 'notes-list', maxItems: 4 },
  'image-upload': { widget: 'image-upload' },
  'long-text':    { widget: null },              // textarea fallback

  // 표시 전용 (read-only displays)
  'plain-text':       { widget: null },           // 단순 텍스트 (input readonly)
  'plain-number':     { widget: null },           // 단순 숫자
  'image-url':        { widget: null },           // 이미지 미리보기 (추후 위젯)
  'rating-display':   { widget: null },           // 별점 표시 (추후 위젯)
  'count':            { widget: null },           // 카운트 표시
  'tag-list':         { widget: null },           // 태그 칩 배열 (추후 위젯)
  'tag-item':         { widget: null },           // 태그 단건 (배열 items 안)

  // 명시적 미지정 — 스펙 작성 원칙상 모든 필드는 x-field-style 가져야 함.
  // 적합한 위젯 없을 때 "none" 으로 명시.
  'none':             { widget: null },
};

export function resolveForm(reqSpec) {
  const key = reqSpec?.['x-form-style'];
  return key ? FORM_STYLES[key] : null;
}

export function resolveField(schema) {
  const key = schema?.['x-field-style'];
  return key ? FIELD_STYLES[key] : null;
}
