import { el, clear } from '../dom.js';
import { api } from '../api.js';

/**
 * alcohol-card 위젯 (한 카드 = 위스키 1개 + 코멘트)
 * - 빈 상태: 검색 input + 드롭다운 → 선택 시 detail hydrate
 * - 채워진 상태: 마스터 정보 카드 (이름·국가·카테고리·캐스크·도수·태그) + 코멘트 textarea
 *
 * getValue() → { alcoholId, comment }
 */
export function createAlcoholCard({ initial = null, onChange, readOnly = false } = {}) {
  let alcoholId = initial?.alcoholId ?? null;
  let detail = initial?.detail ?? null; // 미리 주입 가능 (서버 hydrate 결과)
  let comment = initial?.comment ?? '';

  const root = el('div', { class: 'ac-root' + (readOnly ? ' ac-readonly' : ''), dataset: { widget: 'alcohol-card' } });

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

    // 별점·찜·리뷰 통계 (hydrate 결과)
    const stats = el('div', { class: 'ac-stats' });
    if (detail.rating != null) {
      stats.append(el('span', { class: 'ac-stat ac-rating', text: '★ ' + Number(detail.rating).toFixed(2) }));
    }
    if (detail.totalRatingsCount != null) {
      stats.append(el('span', { class: 'ac-stat', text: '평점 ' + detail.totalRatingsCount + '명' }));
    }
    if (detail.reviewCount != null) {
      stats.append(el('span', { class: 'ac-stat', text: '리뷰 ' + detail.reviewCount }));
    }
    if (detail.totalPickCount != null) {
      stats.append(el('span', { class: 'ac-stat', text: '♡ ' + detail.totalPickCount }));
    }
    if (stats.children.length) body.append(stats);

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

    // 변경 버튼 (readOnly 면 숨김)
    if (!readOnly) {
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
    } else {
      filled.append(illust, body);
    }
  }

  function addInfo(dl, label, value) {
    if (!value) return;
    dl.append(el('dt', { text: label }));
    dl.append(el('dd', { text: value }));
  }

  // readOnly 모드는 검색 영역 숨김
  if (readOnly) {
    searchWrap.style.display = 'none';
  }

  // 초기값 hydrate
  if (detail) {
    renderFilled();
  } else if (alcoholId) {
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
