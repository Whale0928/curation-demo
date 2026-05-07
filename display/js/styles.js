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

  // 페어링 카드 N개. 각 카드 = 4필드 폼 (객체 폼 모드)
  'pairing-list': {
    cardMode:  'object-form',
    addLabel:  '+ 페어링 추가',
    cssClass:  'fs-pairing-list',
    layout: {
      groups: [
        { title: '음식',           rows: [['itemName', 'itemImageUrl']] },
        { title: '페어링되는 위스키', rows: [['alcoholIds']] },
        { title: '페어링 설명',     rows: [['pairingNote']] },
      ],
    },
  },

  // 위스키 ↔ 음식 N:N 매트릭스. root 단일 위젯이 스펙 전체 차지
  'pairing-matrix': {
    cardMode:    'root-widget',
    rootWidget:  'pairing-matrix',
    cssClass:    'fs-pairing-matrix',
  },

  // 시음회 1회차 (단일 객체 폼). 각 섹션마다 비고 4개까지.
  'tasting-form': {
    cardMode:  'object-form-single',
    cssClass:  'fs-tasting-form',
    layout: {
      groups: [
        { title: '일시',
          rows: [['eventDate'], ['startTime', 'endTime'], ['eventNotes']] },
        { title: '장소',
          rows: [['venueName'], ['venueAddress'], ['venueLat', 'venueLng'], ['venueNotes']] },
        { title: '참가비·정원',
          rows: [['entryFee', 'capacity'], ['feeNotes']] },
        { title: '시음 위스키',
          rows: [['alcohols']] },
      ],
    },
  },
};

// 필드 패턴 (property 단위, 위젯과 동작 모드 결정)
export const FIELD_STYLES = {
  'alcohol-search-multi':  { widget: 'alcohol-search', mode: 'multi' },
  'alcohol-search-single': { widget: 'alcohol-search', mode: 'single' },
  'alcohol-card':          { widget: 'alcohol-card' },
  'alcohol-card-list':     { widget: 'alcohol-card-list' }, // 카드 N개 (각 카드: alcohol-card + 코멘트)
  'notes-list':            { widget: 'notes-list', maxItems: 4 },
  'image-upload':          { widget: 'image-upload' },     // 미구현 시 text fallback
  'long-text':             { widget: null /* textarea fallback */ },
};

export function resolveForm(reqSpec) {
  const key = reqSpec?.['x-form-style'];
  return key ? FORM_STYLES[key] : null;
}

export function resolveField(schema) {
  const key = schema?.['x-field-style'];
  return key ? FIELD_STYLES[key] : null;
}
