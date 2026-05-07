import { el } from '../dom.js';

/**
 * notes-list
 * - 텍스트 줄 N개 동적 추가/삭제 (최대 maxItems)
 * - readOnly + initial 지원
 */
export function createNotesList({
  maxItems = 4,
  placeholder = '비고 한 줄',
  readOnly = false,
  initial = [],
} = {}) {
  const root = el('div', { class: 'nl-root' + (readOnly ? ' nl-readonly' : '') });
  const list = el('div', { class: 'nl-list' });
  const items = [];

  const addBtn = el('button', {
    type: 'button', class: 'ghost nl-add',
    onClick: () => addItem(),
  });

  function addItem(value = '') {
    if (items.length >= maxItems) return;
    const input = el('input', { type: 'text', class: 'nl-input', placeholder, value });
    if (readOnly) input.readOnly = true;
    const removeBtn = readOnly
      ? null
      : el('button', { type: 'button', class: 'nl-x', title: '비고 삭제', onClick: () => removeItem(row) }, '×');
    const row = el('div', { class: 'nl-row' });
    row.append(input);
    if (removeBtn) row.append(removeBtn);
    list.append(row);
    items.push({ row, input });
    updateAddBtn();
    if (!readOnly) input.focus();
  }
  function removeItem(row) {
    const idx = items.findIndex((it) => it.row === row);
    if (idx < 0) return;
    items.splice(idx, 1);
    row.remove();
    updateAddBtn();
  }
  function updateAddBtn() {
    addBtn.disabled = items.length >= maxItems;
    addBtn.textContent = `+ 비고 추가 (${items.length}/${maxItems})`;
  }

  updateAddBtn();
  root.append(list);
  if (!readOnly) root.append(addBtn);

  // 초기값 주입
  initial.forEach((v) => addItem(String(v ?? '')));

  return {
    element: root,
    getValue() {
      return items.map((it) => it.input.value.trim()).filter((v) => v.length > 0);
    },
    isEmpty() {
      return items.every((it) => !it.input.value.trim());
    },
  };
}
