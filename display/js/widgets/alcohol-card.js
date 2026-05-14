import { el, clear } from '../dom.js';
import { api } from '../api.js';

const SOURCE_BOTTLE_NOTE = 'BOTTLE_NOTE';
const SOURCE_MANUAL = 'MANUAL';
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 30;

export function createAlcoholCard({ initial = null, onChange, readOnly = false } = {}) {
  const root = el('div', {
    class: 'ac-root' + (readOnly ? ' ac-readonly' : ''),
    dataset: { widget: 'alcohol-card' },
  });

  let state = normalizeInitial(initial);
  let searchTimer = null;

  render();

  function render() {
    clear(root);
    if (readOnly) {
      root.append(renderDisplay());
      return;
    }
    if (hasAlcohol(state.alcohol)) {
      root.append(renderDisplay(), renderModeActions());
      return;
    }
    root.append(renderSearch());
  }

  function renderSearch() {
    const searchWrap = el('div', { class: 'ac-search' });
    const searchInput = el('input', {
      type: 'search',
      class: 'aw-input',
      placeholder: '위스키 검색 또는 직접 입력',
      autocomplete: 'off',
    });
    const dropdown = el('div', { class: 'aw-dropdown' });
    dropdown.style.display = 'none';

    searchInput.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => doSearch(searchInput.value.trim(), dropdown), 220);
    });
    searchInput.addEventListener('focus', () => doSearch(searchInput.value.trim(), dropdown));
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) dropdown.style.display = 'none';
    }, { once: true });

    const manualBtn = el('button', {
      type: 'button',
      class: 'ac-manual-btn',
      onClick: () => {
        state = {
          source: SOURCE_MANUAL,
          alcohol: emptyAlcohol(),
          stats: null,
        };
        renderManualEditor();
      },
    }, '직접 입력');

    searchWrap.append(
      el('div', { class: 'ac-search-row' }, searchInput, manualBtn),
      dropdown
    );
    return searchWrap;
  }

  async function doSearch(q, dropdown) {
    try {
      const list = q ? await api.searchAlcohols(q, 12) : await api.listAlcohols(20);
      renderDropdown(dropdown, list);
    } catch (e) {
      renderDropdown(dropdown, [], e.message);
    }
  }

  function renderDropdown(dropdown, list, err) {
    clear(dropdown);
    if (err) dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '오류: ' + err }));
    else if (!list.length) dropdown.append(el('div', { class: 'aw-item aw-item-empty', text: '검색 결과 없음' }));
    else {
      list.forEach((a) => {
        dropdown.append(el('div',
          { class: 'aw-item', onClick: () => pick(a.id, dropdown) },
          el('div', { class: 'aw-item-main' },
            el('strong', { text: a.korName }),
            el('small', { text: a.engName || '' })
          )
        ));
      });
    }
    dropdown.style.display = 'block';
  }

  async function pick(id, dropdown) {
    dropdown.style.display = 'none';
    try {
      const detail = await api.alcoholDetail(id);
      state = {
        source: SOURCE_BOTTLE_NOTE,
        alcohol: alcoholMirror(detail, id),
        stats: statsFromDetail(detail),
      };
      render();
      onChange?.();
    } catch (e) {
      console.error(e);
    }
  }

  function renderManualEditor() {
    clear(root);
    root.append(buildManualEditor());
    onChange?.();
  }

  function buildManualEditor() {
    const fields = [
      ['korName', '이름', '라이더스 티라미수 에디션'],
      ['engName', '영문명', 'Riders Tiramisu Edition'],
      ['imageUrl', '이미지 URL', 'https://...'],
      ['regionName', '지역', '스코틀랜드'],
      ['korCategory', '카테고리', '싱글 몰트'],
      ['cask', '캐스크', '셰리 캐스크'],
      ['abv', '도수', '43'],
      ['volume', '용량', '700ml'],
    ];

    const form = el('div', { class: 'ac-manual' },
      el('div', { class: 'ac-manual-head' },
        el('strong', { text: '직접 입력 위스키' }),
        el('button', { type: 'button', class: 'ac-change', onClick: clearSelection }, '검색으로 변경')
      )
    );

    const grid = el('div', { class: 'ac-manual-grid' });
    fields.forEach(([key, label, placeholder]) => {
      const input = el('input', {
        type: key === 'imageUrl' ? 'url' : 'text',
        class: 'aw-input',
        value: state.alcohol?.[key] || '',
        placeholder,
      });
      input.addEventListener('input', () => {
        state.alcohol[key] = input.value.trim();
        onChange?.();
      });
      grid.append(el('label', { class: 'ac-manual-field' },
        el('span', { text: label }),
        input
      ));
    });
    form.append(grid, renderImagePreview(), renderTagEditor());
    return form;
  }

  function renderImagePreview() {
    const src = state.alcohol?.imageUrl || '';
    return el('div', { class: 'image-url-preview-field ac-image-url-field' },
      el('div', { class: 'image-url-preview-box' },
        src ? el('img', { src, alt: state.alcohol?.korName || '위스키 이미지' }) : el('span', { text: '이미지 미리보기' })
      ),
      el('input', {
        type: 'url',
        class: 'cd-input',
        readonly: '',
        value: src,
        placeholder: '이미지 URL',
      })
    );
  }

  function renderTagEditor() {
    const box = el('div', { class: 'ac-tag-editor' });
    const chips = el('div', { class: 'ac-tags' });
    const counter = el('small', { text: `${selectedTags().length}/${MAX_TAGS}` });
    const input = el('input', {
      type: 'text',
      class: 'aw-input',
      placeholder: '태그 입력 후 Enter',
      maxlength: String(MAX_TAG_LENGTH),
    });
    const addBtn = el('button', { type: 'button', class: 'ac-manual-btn' }, '추가');

    const redraw = () => {
      clear(chips);
      const tags = selectedTags();
      counter.textContent = `${tags.length}/${MAX_TAGS}`;
      tags.forEach((tag, index) => {
        chips.append(el('span', { class: 'ac-tag ac-tag-editable' },
          el('span', { class: 'ac-tag-name', text: tag }),
          el('button', {
            type: 'button',
            class: 'ac-tag-move',
            title: '앞으로 이동',
            disabled: index === 0 ? '' : null,
            onClick: () => moveTag(index, -1, redraw),
          }, '‹'),
          el('button', {
            type: 'button',
            class: 'ac-tag-move',
            title: '뒤로 이동',
            disabled: index === tags.length - 1 ? '' : null,
            onClick: () => moveTag(index, 1, redraw),
          }, '›'),
          el('button', {
            type: 'button',
            class: 'ac-tag-remove',
            title: '태그 삭제',
            onClick: () => removeTag(index, redraw),
          }, '×')
        ));
      });
    };
    const addTag = () => {
      const value = input.value.trim().slice(0, MAX_TAG_LENGTH);
      if (!value) return;
      const tags = selectedTags();
      if (tags.length >= MAX_TAGS || tags.includes(value)) return;
      state.alcohol.selectedTags = [...tags, value];
      input.value = '';
      redraw();
      onChange?.();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });
    addBtn.addEventListener('click', addTag);

    redraw();
    box.append(
      el('div', { class: 'ac-tag-editor-head' },
        el('strong', { text: '테이스팅 태그' }),
        counter
      ),
      chips,
      el('div', { class: 'ac-search-row' }, input, addBtn)
    );
    return box;
  }

  function renderDisplay() {
    const alcohol = state.alcohol || {};
    if (!hasAlcohol(alcohol)) {
      return el('div', { class: 'ac-empty', text: '위스키 정보 없음' });
    }

    const illust = el('div', { class: 'ac-illust' },
      alcohol.imageUrl
        ? el('img', { src: alcohol.imageUrl, alt: alcohol.korName || '위스키 이미지' })
        : el('div', { class: 'ac-illust-placeholder', text: '이미지' })
    );

    const body = el('div', { class: 'ac-body' });
    body.append(el('div', { class: 'ac-title' },
      el('strong', { text: alcohol.korName || '직접 입력 위스키' }),
      alcohol.engName ? el('span', { class: 'ac-eng', text: alcohol.engName }) : null,
      state.source === SOURCE_MANUAL ? el('span', { class: 'ac-source', text: '직접 입력' }) : null
    ));

    const stats = state.stats || statsFromDetail(alcohol);
    body.append(renderStats(stats));

    const info = el('dl', { class: 'ac-info' });
    addInfo(info, '지역', alcohol.regionName);
    addInfo(info, '카테고리', alcohol.korCategory);
    addInfo(info, '캐스크', alcohol.cask);
    addInfo(info, '도수', alcohol.abv ? `${alcohol.abv}%` : null);
    addInfo(info, '용량', alcohol.volume);
    if (info.children.length) body.append(info);

    const tags = selectedTags(alcohol);
    if (!readOnly) {
      body.append(renderTagEditor());
    } else if (tags.length) {
      body.append(el('div', { class: 'ac-tags' },
        ...tags.map((t) => el('span', { class: 'ac-tag', text: t }))
      ));
    }

    return el('div', { class: 'ac-filled' }, illust, body);
  }

  function renderModeActions() {
    return el('div', { class: 'ac-card-actions' },
      el('button', { type: 'button', class: 'ac-change', onClick: clearSelection }, '위스키 변경'),
      el('button', {
        type: 'button',
        class: 'ac-change',
        onClick: () => {
          state.source = SOURCE_MANUAL;
          state.alcohol = { ...emptyAlcohol(), ...state.alcohol, alcoholId: null };
          state.stats = null;
          renderManualEditor();
        },
      }, '직접 입력으로 전환')
    );
  }

  function clearSelection() {
    state = {
      source: SOURCE_MANUAL,
      alcohol: emptyAlcohol(),
      stats: null,
    };
    render();
    onChange?.();
  }

  function renderStats(stats) {
    if (!stats) return el('div', { class: 'ac-stats ac-stats-empty', text: '통계 없음' });
    const wrap = el('div', { class: 'ac-stats' });
    if (stats.rating != null) wrap.append(el('span', { class: 'ac-stat ac-rating', text: '★ ' + Number(stats.rating).toFixed(2) }));
    if (stats.totalRatingsCount != null) wrap.append(el('span', { class: 'ac-stat', text: '평점 ' + stats.totalRatingsCount + '명' }));
    if (stats.reviewCount != null) wrap.append(el('span', { class: 'ac-stat', text: '리뷰 ' + stats.reviewCount }));
    if (stats.totalPickCount != null) wrap.append(el('span', { class: 'ac-stat', text: '찜 ' + stats.totalPickCount }));
    return wrap.children.length ? wrap : el('div', { class: 'ac-stats ac-stats-empty', text: '통계 없음' });
  }

  function addInfo(dl, label, value) {
    if (!value) return;
    dl.append(el('dt', { text: label }), el('dd', { text: value }));
  }

  function selectedTags(alcohol = state.alcohol) {
    return normalizeTags(alcohol?.selectedTags ?? alcohol?.tags);
  }

  function moveTag(index, direction, redraw) {
    const tags = selectedTags();
    const next = index + direction;
    if (next < 0 || next >= tags.length) return;
    [tags[index], tags[next]] = [tags[next], tags[index]];
    state.alcohol.selectedTags = tags;
    redraw();
    onChange?.();
  }

  function removeTag(index, redraw) {
    state.alcohol.selectedTags = selectedTags().filter((_, i) => i !== index);
    redraw();
    onChange?.();
  }

  return {
    element: root,
    getValue() {
      return publicCard(false);
    },
    getPreviewValue() {
      return publicCard(true);
    },
    setComment(v) {
      state.comment = v;
    },
    isEmpty() {
      return !hasAlcohol(state.alcohol);
    },
  };

  function publicCard(includeHydrated) {
    const source = state.source === SOURCE_BOTTLE_NOTE && state.alcohol?.alcoholId != null
      ? SOURCE_BOTTLE_NOTE
      : SOURCE_MANUAL;
    const card = {
      source,
      alcohol: sanitizeAlcohol(state.alcohol, source),
    };
    if (state.comment != null) card.comment = state.comment;
    if (includeHydrated) {
      card.stats = source === SOURCE_BOTTLE_NOTE ? (state.stats || null) : null;
    }
    return card;
  }
}

function normalizeInitial(initial) {
  if (!initial) {
    return { source: SOURCE_MANUAL, alcohol: emptyAlcohol(), stats: null };
  }
  if (initial.alcohol) {
    const source = initial.source || (initial.alcohol.alcoholId != null ? SOURCE_BOTTLE_NOTE : SOURCE_MANUAL);
    return {
      source,
      alcohol: sanitizeAlcohol(initial.alcohol, source),
      stats: initial.stats ?? statsFromDetail(initial.alcohol),
      comment: initial.comment,
    };
  }
  if (initial.detail) {
    const source = initial.detail.alcoholId != null ? SOURCE_BOTTLE_NOTE : SOURCE_MANUAL;
    return {
      source,
      alcohol: alcoholMirror(initial.detail, initial.alcoholId),
      stats: initial.stats ?? statsFromDetail(initial.detail),
      comment: initial.comment,
    };
  }
  const source = initial.alcoholId != null ? SOURCE_BOTTLE_NOTE : (initial.source || SOURCE_MANUAL);
  return {
    source,
    alcohol: sanitizeAlcohol(initial, source),
    stats: initial.stats ?? statsFromDetail(initial),
    comment: initial.comment,
  };
}

function alcoholMirror(detail, fallbackId) {
  const source = detail?.alcoholId != null || fallbackId != null ? SOURCE_BOTTLE_NOTE : SOURCE_MANUAL;
  return sanitizeAlcohol({
    alcoholId: detail?.alcoholId ?? fallbackId ?? null,
    korName: detail?.korName || '',
    engName: detail?.engName || '',
    imageUrl: detail?.imageUrl || '',
    regionName: detail?.regionName || '',
    korCategory: detail?.korCategory || '',
    cask: detail?.cask || '',
    abv: detail?.abv == null ? '' : String(detail.abv),
    volume: detail?.volume || '',
    selectedTags: normalizeTags(detail?.selectedTags ?? detail?.tags),
  }, source);
}

function sanitizeAlcohol(alcohol, source) {
  const a = alcohol || {};
  const id = source === SOURCE_BOTTLE_NOTE && a.alcoholId != null ? Number(a.alcoholId) : null;
  return {
    alcoholId: Number.isFinite(id) ? id : null,
    korName: stringValue(a.korName),
    engName: stringValue(a.engName),
    imageUrl: stringValue(a.imageUrl),
    regionName: stringValue(a.regionName),
    korCategory: stringValue(a.korCategory),
    cask: stringValue(a.cask),
    abv: stringValue(a.abv),
    volume: stringValue(a.volume),
    selectedTags: normalizeTags(a.selectedTags ?? a.tags),
  };
}

function emptyAlcohol() {
  return {
    alcoholId: null,
    korName: '',
    engName: '',
    imageUrl: '',
    regionName: '',
    korCategory: '',
    cask: '',
    abv: '',
    volume: '',
    selectedTags: [],
  };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const result = [];
  tags.forEach((tag) => {
    const name = typeof tag === 'string' ? tag : (tag?.korName || tag?.name || tag?.engName);
    const value = stringValue(name).slice(0, MAX_TAG_LENGTH);
    if (value && !result.includes(value) && result.length < MAX_TAGS) result.push(value);
  });
  return result;
}

function statsFromDetail(detail) {
  if (!detail) return null;
  const stats = {};
  if (detail.rating != null) stats.rating = detail.rating;
  if (detail.totalRatingsCount != null) stats.totalRatingsCount = detail.totalRatingsCount;
  if (detail.reviewCount != null) stats.reviewCount = detail.reviewCount;
  if (detail.totalPickCount != null) stats.totalPickCount = detail.totalPickCount;
  return Object.keys(stats).length ? stats : null;
}

function hasAlcohol(alcohol) {
  return Boolean(alcohol && (alcohol.alcoholId != null || stringValue(alcohol.korName)));
}

function stringValue(value) {
  return value == null ? '' : String(value).trim();
}
