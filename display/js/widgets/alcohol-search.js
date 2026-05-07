import { el, clear } from '../dom.js';
import { api } from '../api.js';

/**
 * alcohol-search 위젯
 * - mode "single": 1개 선택, 칩 1개로 표시
 * - mode "multi":  N개 선택, 칩 배열로 표시
 *
 * 사용법:
 *   const w = createAlcoholSearch({ mode: 'multi', name: 'alcoholIds' });
 *   container.append(w.element);
 *   w.getValue() // → number 또는 number[]
 */
export function createAlcoholSearch({ mode = 'single', name = 'alcohol' }) {
  const isMulti = mode === 'multi';
  const selected = []; // {id, korName, engName, imageUrl}

  const root = el('div', { class: 'aw-root', dataset: { widget: 'alcohol-search', mode, name } });

  const chipBar = el('div', { class: 'aw-chips' });
  const empty = el('span', { class: 'aw-empty', text: isMulti ? '선택된 위스키 없음' : '선택 안 됨' });
  chipBar.append(empty);

  const input = el('input', {
    type: 'search',
    class: 'aw-input',
    placeholder: '클릭해서 위스키 선택, 또는 한글/영문 이름 검색…',
    autocomplete: 'off',
  });
  const dropdown = el('div', { class: 'aw-dropdown' });
  dropdown.style.display = 'none';

  const inputWrap = el('div', { class: 'aw-input-wrap' }, input, dropdown);
  root.append(chipBar, inputWrap);

  // 검색 (debounced)
  let timer = null;
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(q), 250);
  });
  input.addEventListener('focus', () => doSearch(input.value.trim()));
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) hideDropdown();
  });

  async function doSearch(q) {
    try {
      // 빈 검색어 → 알코올 목록(기본) / 검색어 있으면 → 검색
      const list = q ? await api.searchAlcohols(q, 12) : await api.listAlcohols(20);
      renderDropdown(list, null, q === '');
    } catch (e) {
      renderDropdown([], e.message);
    }
  }

  function renderDropdown(list, errorMsg, isBrowse = false) {
    clear(dropdown);
    if (errorMsg) {
      dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: `오류: ${errorMsg}` }));
    } else if (!list.length) {
      dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '검색 결과 없음' }));
    } else {
      if (isBrowse) {
        dropdown.append(el('div', { class: 'aw-hint', text: '전체 목록 (검색어 입력 시 좁아짐)' }));
      }
      list.forEach(a => {
        const isAlready = selected.some(s => s.id === a.id);
        const item = el('div',
          {
            class: 'aw-item' + (isAlready ? ' aw-item-disabled' : ''),
            onClick: isAlready ? null : () => addSelected(a),
          },
          el('div', { class: 'aw-item-main' },
            el('strong', { text: a.korName }),
            el('small', { text: a.engName || '' })
          ),
          isAlready ? el('span', { class: 'aw-item-tag', text: '선택됨' }) : null
        );
        dropdown.append(item);
      });
    }
    dropdown.style.display = 'block';
  }

  function hideDropdown() {
    dropdown.style.display = 'none';
    clear(dropdown);
  }

  function addSelected(a) {
    if (!isMulti) selected.length = 0; // single 모드는 교체
    if (!selected.some(s => s.id === a.id)) {
      selected.push({ id: a.id, korName: a.korName, engName: a.engName });
    }
    input.value = '';
    hideDropdown();
    renderChips();
  }

  function removeSelected(id) {
    const idx = selected.findIndex(s => s.id === id);
    if (idx >= 0) selected.splice(idx, 1);
    renderChips();
  }

  function renderChips() {
    clear(chipBar);
    if (!selected.length) {
      chipBar.append(el('span', { class: 'aw-empty', text: isMulti ? '선택된 위스키 없음' : '선택 안 됨' }));
      return;
    }
    selected.forEach(a => {
      const chip = el('span', { class: 'aw-chip' },
        el('span', { class: 'aw-chip-name', text: a.korName }),
        el('button', {
          type: 'button', class: 'aw-chip-x',
          title: '제거',
          onClick: () => removeSelected(a.id),
        }, '×')
      );
      chipBar.append(chip);
    });
  }

  return {
    element: root,
    getValue() {
      const ids = selected.map(s => s.id);
      return isMulti ? ids : (ids[0] ?? null);
    },
    isEmpty() {
      return selected.length === 0;
    },
  };
}
