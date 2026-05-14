import { createCardList } from './card-list.js';
import { createAlcoholCard } from './alcohol-card.js';

/**
 * alcohol-card-list
 * - 카드 N개 (각 카드: alcohol-card + 코멘트)
 * - readOnly + initial 지원
 *
 * @param {Object[]} initial   - [{alcoholId, comment, detail?}, ...]
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
  // initial 카드 항목에 detail 주입 — item.detail 우선, 없으면 매핑 fallback
  const initialWithDetail = initial.map((item) => ({
    ...item,
    detail:
      item?.detail
      ?? (item?.alcoholId != null ? alcoholDetailMap[item.alcoholId] : null),
  }));

  const list = createCardList({
    cardFactory: (initialItem) => {
      const widget = createAlcoholCard({ initial: initialItem, readOnly, onChange });
      return {
        element: widget.element,
        getValue() {
          const v = widget.getValue();
          return v && typeof v === 'object' ? v : { alcoholId: v };
        },
        getPreviewValue() {
          const v = widget.getPreviewValue?.() ?? widget.getValue();
          return v && typeof v === 'object' ? v : { alcoholId: v };
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
      return list.getValue().filter((v) => v && v.alcoholId != null);
    },
    getPreviewValue() {
      return list.getPreviewValue().filter((v) => v && v.alcoholId != null);
    },
    isEmpty() { return list.isEmpty(); },
  };
}
