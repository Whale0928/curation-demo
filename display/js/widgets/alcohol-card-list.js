import { createCardList } from './card-list.js';
import { createAlcoholCard } from './alcohol-card.js';

/**
 * alcohol-card-list
 * - 카드 N개 (각 카드: alcohol-card + 코멘트)
 * - readOnly + initial 지원
 *
 * @param {Object[]} initial   - [{source, alcohol, comment, stats?}, ...]
 * @param {Object}   alcoholDetailMap - { [id]: AlcoholDetailResponse } (서버 hydrate 매핑)
 */
export function createAlcoholCardList({
  addLabel = '+ 위스키 추가',
  commentLabel = '시음회 추가 설명 · 선택',
  commentHelper = '시음회만의 추가 설명',
  readOnly = false,
  initial = [],
  alcoholDetailMap = {},
  onChange,
} = {}) {
  // initial 카드 항목에 detail 주입 — 구형 alcoholId payload 도 조회용으로 유지
  const initialWithDetail = initial.map((item) => ({
    ...item,
    detail:
      item?.detail
      ?? (item?.alcoholId != null ? alcoholDetailMap[item.alcoholId] : null)
      ?? (item?.alcohol?.alcoholId != null ? alcoholDetailMap[item.alcohol.alcoholId] : null),
  }));

  const list = createCardList({
    cardFactory: (initialItem) => {
      const widget = createAlcoholCard({ initial: initialItem, readOnly, onChange });
      return {
        element: widget.element,
        getValue() {
          const v = widget.getValue();
          return v && typeof v === 'object' ? v : { source: 'MANUAL', alcohol: { alcoholId: null, korName: String(v || '') } };
        },
        getPreviewValue() {
          const v = widget.getPreviewValue?.() ?? widget.getValue();
          return v && typeof v === 'object' ? v : { source: 'MANUAL', alcohol: { alcoholId: null, korName: String(v || '') } };
        },
        isEmpty() { return widget.isEmpty(); },
      };
    },
    addLabel,
    commentFieldName: 'comment',
    commentLabel,
    commentHelper,
    readOnly,
    initial: initialWithDetail,
    onChange,
  });

  return {
    element: list.element,
    getValue() {
      return list.getValue().filter(hasAlcoholPayload);
    },
    getPreviewValue() {
      return list.getPreviewValue().filter(hasAlcoholPayload);
    },
    isEmpty() { return list.getValue().filter(hasAlcoholPayload).length === 0; },
  };
}

function hasAlcoholPayload(v) {
  const alcohol = v?.alcohol || v;
  return Boolean(alcohol && (alcohol.alcoholId != null || String(alcohol.korName || '').trim()));
}
