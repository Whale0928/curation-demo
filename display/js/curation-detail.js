import { el, clear } from './dom.js';
import { api } from './api.js';
import { FORM_STYLES, FIELD_STYLES } from './styles.js';
import { createAlcoholCard } from './widgets/alcohol-card.js';
import { createAlcoholCardList } from './widgets/alcohol-card-list.js';
import { createNotesList } from './widgets/notes-list.js';
import { createPairingMatrix } from './widgets/pairing-matrix.js';

const root = document.getElementById('root');
const meta = document.getElementById('meta');

const id = new URLSearchParams(location.search).get('id');
if (!id) {
  meta.textContent = '에러';
  root.append(el('div', { class: 'error' },
    el('div', { text: 'id 쿼리 파라미터가 없습니다.' }),
    el('div', { text: '예: curation-detail.html?id=4' })
  ));
} else {
  load(id);
}

async function load(id) {
  meta.textContent = '로딩 중…';
  clear(root);
  root.append(el('div', { class: 'loading', text: '불러오는 중…' }));
  try {
    const d = await api.curationDetail(id);
    render(d);
  } catch (e) {
    clear(root);
    root.append(el('div', { class: 'error', text: '상세 조회 실패 — ' + (e.body?.message || e.message) }));
    meta.textContent = '오류';
  }
}

function render(d) {
  meta.textContent = `id=${d.id} · spec=${d.specCode} · ${d.container}`;
  clear(root);

  // 헤더
  root.append(renderHeader(d));

  // payload + responseSpec(JSON 객체) → form-style 분기로 readOnly 폼 렌더
  const responseSpec = normalize(d.responseSpec);
  const payload = normalize(d.payload);
  const alcohols = d.alcohols || {};

  const formKey = responseSpec?.['x-form-style'];
  const formStyle = formKey ? FORM_STYLES[formKey] : null;

  if (!payload) {
    root.append(el('div', { class: 'empty', text: 'payload 가 없습니다.' }));
    return;
  }
  if (!formStyle) {
    root.append(el('div', { class: 'empty', text: `폼 스타일을 찾을 수 없음: ${formKey}` }));
    return;
  }

  const formRoot = el('div', { class: 'cd-form ' + (formStyle.cssClass || '') });
  root.append(formRoot);

  switch (formStyle.cardMode) {
    case 'rich-with-comment':
      formRoot.append(buildAlcoholCardList(formStyle, payload, alcohols));
      break;
    case 'object-form':
      formRoot.append(buildObjectFormList(formStyle, responseSpec, payload, alcohols));
      break;
    case 'object-form-single':
      formRoot.append(buildSingleObjectForm(formStyle, responseSpec, payload, alcohols));
      break;
    case 'root-widget':
      formRoot.append(buildRootWidget(formStyle, payload, alcohols));
      break;
    default:
      formRoot.append(el('div', { class: 'empty', text: 'cardMode 미지원: ' + formStyle.cardMode }));
  }
}

function renderHeader(d) {
  return el('section', { class: 'cd-header' },
    d.coverImageUrl
      ? el('div', { class: 'cd-cover' }, el('img', { src: d.coverImageUrl, alt: d.name }))
      : null,
    el('div', { class: 'cd-headtext' },
      el('div', { class: 'cd-badges' },
        el('span', { class: 'badge', text: d.specCode }),
        el('span', { class: 'badge', text: d.container }),
        d.isActive ? el('span', { class: 'badge', text: 'ACTIVE' }) : null
      ),
      el('h2', { text: d.name }),
      el('p', { class: 'subtitle', text: d.description || '' })
    )
  );
}

// ALCOHOL_LIST — payload 가 카드 배열, 각 카드 = {alcoholId, comment}
function buildAlcoholCardList(formStyle, payload, alcoholDetailMap) {
  const list = createAlcoholCardList({
    readOnly: true,
    initial: Array.isArray(payload) ? payload : [],
    alcoholDetailMap,
    addLabel: formStyle.addLabel,
    commentLabel: '큐레이터 코멘트',
    commentHelper: '',
  });
  return list.element;
}

// PAIRING_LIST — payload 가 객체 폼 카드 배열
function buildObjectFormList(formStyle, responseSpec, payload, alcoholDetailMap) {
  const arr = Array.isArray(payload) ? payload : [];
  const wrap = el('div', { class: 'cl-root cl-readonly' },
    el('div', { class: 'cl-list' },
      ...arr.map((item, i) =>
        el('div', { class: 'cl-card', draggable: 'false' },
          el('div', { class: 'cl-sidebar' }, el('span', { class: 'cl-number', text: String(i + 1) })),
          el('div', { class: 'cl-body' },
            buildObjectFields(formStyle.layout, responseSpec, item, alcoholDetailMap)
          )
        )
      )
    )
  );
  return wrap;
}

// TASTING_V1 — payload 가 단일 객체
function buildSingleObjectForm(formStyle, responseSpec, payload, alcoholDetailMap) {
  return buildObjectFields(formStyle.layout, responseSpec, payload, alcoholDetailMap);
}

// PAIRING_MATRIX — root 단일 위젯
function buildRootWidget(formStyle, payload, alcoholDetailMap) {
  if (formStyle.rootWidget === 'pairing-matrix') {
    const w = createPairingMatrix({ initial: payload, alcoholDetailMap, readOnly: true });
    return w.element;
  }
  return el('div', { class: 'empty', text: 'rootWidget 미지원: ' + formStyle.rootWidget });
}

// 레이아웃 기반 객체 필드 표시 (readOnly)
function buildObjectFields(layout, responseSpec, payload, alcoholDetailMap) {
  const props = (responseSpec?.properties) || {};
  const wrap = el('div', { class: 'cf-root' });
  const rendered = new Set();

  const renderField = (name) => {
    const schema = props[name] || {};
    if (rendered.has(name)) return null;
    rendered.add(name);
    const value = payload[name];
    return el('div', { class: 'field' },
      el('label', null, schema['x-display-name'] || name),
      buildReadOnlyField(name, schema, value, alcoholDetailMap)
    );
  };

  if (layout && Array.isArray(layout.groups)) {
    layout.groups.forEach((group) => {
      const section = el('div', { class: 'cf-section' });
      if (group.title) section.append(el('div', { class: 'cf-section-title', text: group.title }));
      (group.rows || []).forEach((rowFields) => {
        const cols = rowFields.length;
        const row = el('div', { class: 'cf-row', style: `grid-template-columns: repeat(${cols}, 1fr);` });
        rowFields.forEach((name) => {
          const node = renderField(name);
          if (node) row.append(node);
        });
        section.append(row);
      });
      wrap.append(section);
    });
    // layout 누락 — payload 의 잔여 키
    Object.keys(payload).forEach((name) => {
      if (rendered.has(name)) return;
      const node = renderField(name);
      if (node) wrap.append(node);
    });
  } else {
    Object.keys(payload).forEach((name) => {
      const node = renderField(name);
      if (node) wrap.append(node);
    });
  }
  return wrap;
}

// 단일 필드 readOnly 렌더 (x-field-style 보고 위젯 재사용 또는 plain text)
function buildReadOnlyField(name, schema, value, alcoholDetailMap) {
  const fieldKey = schema['x-field-style'];
  const fs = fieldKey ? FIELD_STYLES[fieldKey] : null;

  if (fs?.widget === 'alcohol-card-list') {
    const w = createAlcoholCardList({
      readOnly: true,
      initial: Array.isArray(value) ? value : [],
      alcoholDetailMap,
      commentLabel: '코멘트',
    });
    return w.element;
  }
  if (fs?.widget === 'alcohol-card') {
    const aid = typeof value === 'object' ? value?.alcoholId : value;
    const w = createAlcoholCard({
      readOnly: true,
      initial: aid != null ? { alcoholId: aid, detail: alcoholDetailMap?.[aid] } : null,
    });
    return w.element;
  }
  if (fs?.widget === 'notes-list') {
    const w = createNotesList({
      readOnly: true,
      maxItems: fs.maxItems || 4,
      initial: Array.isArray(value) ? value : [],
    });
    return w.element;
  }

  // plain
  if (value == null || value === '') return el('span', { class: 'cd-empty', text: '—' });
  if (Array.isArray(value)) return el('span', { class: 'cd-plain', text: JSON.stringify(value) });
  if (typeof value === 'object') return el('span', { class: 'cd-plain', text: JSON.stringify(value) });
  return el('span', { class: 'cd-plain', text: String(value) });
}

function normalize(p) {
  if (p == null) return null;
  if (typeof p === 'string') {
    try { return JSON.parse(p); } catch (_) { return null; }
  }
  return p;
}
