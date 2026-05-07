import { el, clear } from '../dom.js';
import { api } from '../api.js';

/**
 * pairing-matrix 위젯
 * - 위스키 패널 + 음식 패널 + N:N 매트릭스 그리드
 * - getValue() → { primaryAxis, items, alcoholIds, links }
 */
export function createPairingMatrix({ initial = null, alcoholDetailMap = {}, readOnly = false } = {}) {
  const state = {
    primaryAxis: 'ALCOHOL_TO_ITEM',
    alcohols: [],
    items: [],
    linkSet: new Set(),
    nextItemSeq: 1,
  };

  // 초기값 주입
  if (initial) {
    state.primaryAxis = initial.primaryAxis || 'ALCOHOL_TO_ITEM';
    state.items = (initial.items || []).map((i) => ({ itemId: i.itemId, name: i.name }));
    state.alcohols = (initial.alcoholIds || []).map((id) => {
      const d = alcoholDetailMap[id];
      return d
        ? { id, korName: d.korName, korCategory: d.korCategory, abv: d.abv }
        : { id, korName: '#' + id, korCategory: null, abv: null };
    });
    (initial.links || []).forEach((l) => state.linkSet.add(`${l.alcoholId}::${l.itemId}`));
    // nextItemSeq 갱신 (item-1, item-2, ...)
    state.nextItemSeq = state.items.length + 1;
  }

  const root = el('div', { class: 'pm-root' + (readOnly ? ' pm-readonly' : ''), dataset: { widget: 'pairing-matrix' } });

  // --- 헤더 ---
  const headerLabel = el('div', { class: 'pm-head-text' },
    el('strong', { text: '페어링 (위스키 ↔ 음식)' }),
    el('p', { text: 'N:N 자유 연결. 위스키와 음식을 따로 추가하고 원하는 조합으로 묶습니다.' })
  );
  const axisToggle = el('div', { class: 'pm-axis-toggle' });
  const btnA2I = el('button', { type: 'button', onClick: () => setAxis('ALCOHOL_TO_ITEM') }, '위스키 → 음식');
  const btnI2A = el('button', { type: 'button', onClick: () => setAxis('ITEM_TO_ALCOHOL') }, '음식 → 위스키');
  axisToggle.append(btnA2I, btnI2A);

  const header = el('div', { class: 'pm-header' }, headerLabel, axisToggle);

  // --- 통계 ---
  const statBar = el('div', { class: 'pm-stat-bar' });
  const statAlcohol = stat('위스키', '0');
  const statItem    = stat('음식',   '0');
  const statLink    = stat('연결',   '0');
  const statOrphan  = stat('미연결', '0');
  statBar.append(statAlcohol.el, statItem.el, statLink.el, statOrphan.el);

  // --- 패널 (위스키 + 음식) ---
  // 위스키 패널
  const alcoholList = el('div', { class: 'pm-list' });
  const alcoholSearchInput = el('input', {
    type: 'search', class: 'aw-input pm-search-input',
    placeholder: '위스키 검색해서 추가…', autocomplete: 'off',
  });
  const alcoholDropdown = el('div', { class: 'aw-dropdown' });
  alcoholDropdown.style.display = 'none';
  const alcoholSearchWrap = el('div', { class: 'pm-search-wrap' }, alcoholSearchInput, alcoholDropdown);
  const alcoholPanel = el('div', { class: 'pm-panel' },
    el('div', { class: 'pm-panel-head' }, el('strong', { text: 'WHISKIES' }), el('span', { class: 'pm-panel-count' })),
    alcoholList,
    alcoholSearchWrap
  );

  // 음식 패널
  const itemList = el('div', { class: 'pm-list' });
  const itemNameInput = el('input', {
    type: 'text', class: 'aw-input', placeholder: '음식 이름 입력…',
  });
  const addItemBtn = el('button', {
    type: 'button', class: 'ghost', onClick: () => {
      const n = itemNameInput.value.trim();
      if (!n) return;
      addItem(n); itemNameInput.value = ''; itemNameInput.focus();
    },
  }, '추가');
  itemNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItemBtn.click(); }
  });
  const itemAddRow = el('div', { class: 'pm-add-row' }, itemNameInput, addItemBtn);
  const itemPanel = el('div', { class: 'pm-panel' },
    el('div', { class: 'pm-panel-head' }, el('strong', { text: 'ITEMS' }), el('span', { class: 'pm-panel-count' })),
    itemList,
    itemAddRow
  );

  const panelRow = el('div', { class: 'pm-panel-row' }, alcoholPanel, itemPanel);

  // --- 매트릭스 ---
  const matrix = el('div', { class: 'pm-matrix-wrap' });
  const matrixHint = el('div', { class: 'pm-matrix-hint' });
  const matrixHost = el('div', { class: 'pm-matrix-grid' });
  matrix.append(matrixHint, matrixHost);

  root.append(header, statBar, panelRow, matrix);

  // readOnly 면 입력 영역들 숨김
  if (readOnly) {
    alcoholSearchWrap.style.display = 'none';
    itemAddRow.style.display = 'none';
  }

  // --- 검색 동작 ---
  let timer = null;
  alcoholSearchInput.addEventListener('input', () => {
    const q = alcoholSearchInput.value.trim();
    clearTimeout(timer);
    timer = setTimeout(() => searchAlcohols(q), 250);
  });
  alcoholSearchInput.addEventListener('focus', () => searchAlcohols(alcoholSearchInput.value.trim()));
  document.addEventListener('click', (e) => {
    if (!alcoholSearchWrap.contains(e.target)) alcoholDropdown.style.display = 'none';
  });

  async function searchAlcohols(q) {
    try {
      const list = q ? await api.searchAlcohols(q, 10) : await api.listAlcohols(15);
      renderAlcoholDropdown(list);
    } catch (e) {
      renderAlcoholDropdown([], e.message);
    }
  }
  function renderAlcoholDropdown(list, err) {
    clear(alcoholDropdown);
    if (err) alcoholDropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '오류: ' + err }));
    else if (!list.length) alcoholDropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '검색 결과 없음' }));
    else {
      list.forEach((a) => {
        const isAlready = state.alcohols.some((x) => x.id === a.id);
        const meta = [a.korCategory, a.abv ? a.abv + '%' : null].filter(Boolean).join(' · ');
        alcoholDropdown.append(
          el('div', {
            class: 'aw-item' + (isAlready ? ' aw-item-disabled' : ''),
            onClick: isAlready ? null : () => { addAlcohol(a); alcoholSearchInput.value = ''; alcoholDropdown.style.display = 'none'; },
          },
            el('div', { class: 'aw-item-main' },
              el('strong', { text: a.korName }),
              el('small', { text: a.engName || '' }),
              meta ? el('span', { class: 'aw-item-meta', text: meta }) : null
            ),
            isAlready ? el('span', { class: 'aw-item-tag', text: '추가됨' }) : null
          )
        );
      });
    }
    alcoholDropdown.style.display = 'block';
  }

  // --- 액션 ---
  function addAlcohol(a) {
    if (state.alcohols.some((x) => x.id === a.id)) return;
    state.alcohols.push({ id: a.id, korName: a.korName, korCategory: a.korCategory, abv: a.abv });
    redraw();
  }
  function removeAlcohol(id) {
    state.alcohols = state.alcohols.filter((a) => a.id !== id);
    [...state.linkSet].forEach((k) => { if (k.startsWith(id + '::')) state.linkSet.delete(k); });
    redraw();
  }
  function addItem(name) {
    const itemId = `item-${state.nextItemSeq++}`;
    state.items.push({ itemId, name });
    redraw();
  }
  function removeItem(itemId) {
    state.items = state.items.filter((i) => i.itemId !== itemId);
    [...state.linkSet].forEach((k) => { if (k.endsWith('::' + itemId)) state.linkSet.delete(k); });
    redraw();
  }
  function toggleLink(aid, iid) {
    const k = `${aid}::${iid}`;
    if (state.linkSet.has(k)) state.linkSet.delete(k);
    else state.linkSet.add(k);
    redraw();
  }
  function setAxis(axis) {
    state.primaryAxis = axis;
    redraw();
  }

  // --- 렌더 ---
  function redraw() {
    // toggle 활성 표시
    btnA2I.classList.toggle('active', state.primaryAxis === 'ALCOHOL_TO_ITEM');
    btnI2A.classList.toggle('active', state.primaryAxis === 'ITEM_TO_ALCOHOL');

    // 통계
    const linkArr = [...state.linkSet];
    statAlcohol.set(String(state.alcohols.length));
    statItem.set(String(state.items.length));
    statLink.set(String(linkArr.length));
    const aIds = new Set(state.alcohols.map((a) => a.id));
    const iIds = new Set(state.items.map((i) => i.itemId));
    const linkedA = new Set(); const linkedI = new Set();
    linkArr.forEach((k) => { const [a, i] = k.split('::'); linkedA.add(Number(a)); linkedI.add(i); });
    const orphanA = [...aIds].filter((a) => !linkedA.has(a)).length;
    const orphanI = [...iIds].filter((i) => !linkedI.has(i)).length;
    statOrphan.set(String(orphanA + orphanI));

    // 위스키 패널
    clear(alcoholList);
    alcoholPanel.querySelector('.pm-panel-count').textContent = `· ${state.alcohols.length}`;
    state.alcohols.forEach((a) => {
      const cnt = [...state.linkSet].filter((k) => k.startsWith(a.id + '::')).length;
      const meta = [a.korCategory, a.abv ? a.abv + '%' : null].filter(Boolean).join(' · ');
      alcoholList.append(
        el('div', { class: 'pm-list-item' },
          el('div', { class: 'pm-list-icon', text: '🥃' }),
          el('div', { class: 'pm-list-main' },
            el('strong', { text: a.korName }),
            meta ? el('small', { text: meta }) : null
          ),
          el('span', { class: 'pm-list-count', text: String(cnt) }),
          readOnly ? null : el('button', { type: 'button', class: 'pm-list-x', onClick: () => removeAlcohol(a.id) }, '×')
        )
      );
    });

    // 음식 패널
    clear(itemList);
    itemPanel.querySelector('.pm-panel-count').textContent = `· ${state.items.length}`;
    state.items.forEach((it) => {
      const cnt = [...state.linkSet].filter((k) => k.endsWith('::' + it.itemId)).length;
      itemList.append(
        el('div', { class: 'pm-list-item' },
          el('div', { class: 'pm-list-icon', text: '🍽' }),
          el('div', { class: 'pm-list-main' }, el('strong', { text: it.name })),
          el('span', { class: 'pm-list-count', text: String(cnt) }),
          readOnly ? null : el('button', { type: 'button', class: 'pm-list-x', onClick: () => removeItem(it.itemId) }, '×')
        )
      );
    });

    // 매트릭스
    clear(matrixHost);
    if (!state.alcohols.length || !state.items.length) {
      matrixHint.textContent = '위스키와 음식을 각각 1개 이상 추가하면 매트릭스가 표시됩니다.';
      return;
    }
    matrixHint.textContent = '셀 클릭으로 연결 토글 (체크 = 연결)';

    const isA2I = state.primaryAxis === 'ALCOHOL_TO_ITEM';
    const rows = isA2I ? state.alcohols.map((a) => ({ key: a.id, label: a.korName })) : state.items.map((i) => ({ key: i.itemId, label: i.name }));
    const cols = isA2I ? state.items.map((i) => ({ key: i.itemId, label: i.name })) : state.alcohols.map((a) => ({ key: a.id, label: a.korName }));

    const grid = el('table', { class: 'pm-table' });
    const thead = el('thead');
    const headTr = el('tr', null, el('th'));
    cols.forEach((c) => headTr.append(el('th', { text: c.label })));
    thead.append(headTr);
    grid.append(thead);
    const tbody = el('tbody');
    rows.forEach((r) => {
      const tr = el('tr');
      tr.append(el('th', { class: 'pm-row-label', text: r.label }));
      cols.forEach((c) => {
        const aid = isA2I ? r.key : c.key;
        const iid = isA2I ? c.key : r.key;
        const k = `${aid}::${iid}`;
        const checked = state.linkSet.has(k);
        const td = el('td', {
          class: 'pm-cell' + (checked ? ' pm-cell-on' : ''),
          onClick: readOnly ? null : () => toggleLink(aid, iid),
        }, checked ? '✓' : '');
        tr.append(td);
      });
      tbody.append(tr);
    });
    grid.append(tbody);
    matrixHost.append(grid);
  }

  function stat(label, init) {
    const valEl = el('strong', { text: init });
    return {
      el: el('div', { class: 'pm-stat' }, valEl, el('small', { text: label })),
      set: (v) => { valEl.textContent = v; },
    };
  }

  redraw();

  return {
    element: root,
    getValue() {
      const links = [...state.linkSet].map((k) => {
        const [a, i] = k.split('::');
        return { alcoholId: Number(a), itemId: i };
      });
      return {
        primaryAxis: state.primaryAxis,
        items: state.items.map((it) => ({ itemId: it.itemId, name: it.name })),
        alcoholIds: state.alcohols.map((a) => a.id),
        links,
      };
    },
    isEmpty() {
      return state.alcohols.length === 0 && state.items.length === 0;
    },
  };
}
