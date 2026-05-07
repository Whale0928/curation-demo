import { el, clear } from '../dom.js';
import { api } from '../api.js';

/**
 * alcohol-card 위젯 (한 카드 = 위스키 1개 + 코멘트)
 * - 빈 상태: 검색 input + 드롭다운 → 선택 시 detail hydrate
 * - 채워진 상태: 마스터 정보 카드 (이름·국가·카테고리·캐스크·도수·태그) + 코멘트 textarea
 *
 * getValue() → { alcoholId, comment }
 */
export function createAlcoholCard({ initial = null, onChange } = {}) {
  let alcoholId = initial?.alcoholId ?? null;
  let detail = null; // hydrated AlcoholDetailResponse
  let comment = initial?.comment ?? '';

  const root = el('div', { class: 'ac-root', dataset: { widget: 'alcohol-card' } });

  // 빈 상태: 검색 영역
  const searchWrap = el('div', { class: 'ac-search' });
  const searchInput = el('input', {
    type: 'search',
    class: 'aw-input',
    placeholder: '클릭해서 위스키 선택, 또는 한글/영문 이름 검색…',
    autocomplete: 'off',
  });
  const dropdown = el('div', { class: 'aw-dropdown' });
  dropdown.style.display = 'none';
  searchWrap.append(searchInput, dropdown);

  // 채워진 상태: 마스터 카드
  const filled = el('div', { class: 'ac-filled' });

  root.append(searchWrap, filled);

  // 검색 동작
  let timer = null;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(q), 250);
  });
  searchInput.addEventListener('focus', () => doSearch(searchInput.value.trim()));
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) dropdown.style.display = 'none';
  });

  async function doSearch(q) {
    try {
      const list = q ? await api.searchAlcohols(q, 12) : await api.listAlcohols(20);
      renderDropdown(list);
    } catch (e) {
      renderDropdown([], e.message);
    }
  }

  function renderDropdown(list, err) {
    clear(dropdown);
    if (err) dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '오류: ' + err }));
    else if (!list.length) dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '검색 결과 없음' }));
    else {
      list.forEach((a) => {
        const item = el('div',
          { class: 'aw-item', onClick: () => pick(a.id) },
          el('div', { class: 'aw-item-main' },
            el('strong', { text: a.korName }),
            el('small', { text: a.engName || '' })
          )
        );
        dropdown.append(item);
      });
    }
    dropdown.style.display = 'block';
  }

  async function pick(id) {
    dropdown.style.display = 'none';
    try {
      detail = await api.alcoholDetail(id);
      alcoholId = id;
      renderFilled();
      onChange?.();
    } catch (e) {
      console.error(e);
    }
  }

  function renderFilled() {
    if (!detail) {
      searchWrap.style.display = '';
      filled.style.display = 'none';
      return;
    }
    searchWrap.style.display = 'none';
    filled.style.display = '';

    clear(filled);

    // 좌측: 일러스트 (이미지 또는 placeholder)
    const illust = el('div', { class: 'ac-illust' },
      detail.imageUrl
        ? el('img', { src: detail.imageUrl, alt: detail.korName })
        : el('div', { class: 'ac-illust-placeholder', text: '🥃' })
    );

    // 본문: 이름 + 정보 표 + 태그
    const body = el('div', { class: 'ac-body' });
    body.append(el('div', { class: 'ac-title' },
      el('strong', { text: detail.korName }),
      el('span', { class: 'ac-eng', text: detail.engName || '' })
    ));

    const info = el('dl', { class: 'ac-info' });
    addInfo(info, '국가', detail.regionName);
    addInfo(info, '카테고리', detail.korCategory);
    addInfo(info, '캐스크', detail.cask);
    const abvVol = [detail.abv ? `${detail.abv}%` : null, detail.volume].filter(Boolean).join(' · ');
    addInfo(info, '도수', abvVol);
    body.append(info);

    if (detail.tags && detail.tags.length) {
      const tags = el('div', { class: 'ac-tags' });
      detail.tags.forEach((t) => tags.append(el('span', { class: 'ac-tag', text: '#' + t.korName })));
      body.append(tags);
    }

    // 변경 버튼 (선택 변경)
    const changeBtn = el('button', {
      type: 'button',
      class: 'ac-change',
      title: '위스키 변경',
      onClick: () => {
        detail = null;
        alcoholId = null;
        renderFilled();
        searchInput.focus();
      },
    }, '변경');

    filled.append(illust, body, changeBtn);
  }

  function addInfo(dl, label, value) {
    if (!value) return;
    dl.append(el('dt', { text: label }));
    dl.append(el('dd', { text: value }));
  }

  // 초기값으로 hydrate (수정 모드)
  if (alcoholId) {
    api.alcoholDetail(alcoholId).then((d) => { detail = d; renderFilled(); }).catch(console.error);
  } else {
    renderFilled();
  }

  return {
    element: root,
    getValue() {
      return { alcoholId, comment };
    },
    setComment(v) { comment = v; },
    isEmpty() { return alcoholId == null; },
  };
}
