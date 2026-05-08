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
  const specCode = d.spec?.code;
  const container = d.spec?.container;
  meta.textContent = `id=${d.id} · spec=${specCode} · ${container}`;
  clear(root);

  // 헤더
  root.append(renderHeader(d));

  // payload + responseSpec → form-style 분기로 readOnly 폼 렌더
  const responseSpec = normalize(d.spec?.responseSpec);
  const payload = normalize(d.payload);

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
      formRoot.append(buildAlcoholCardList(formStyle, payload));
      break;
    case 'object-form':
      formRoot.append(buildObjectFormList(formStyle, responseSpec, payload));
      break;
    case 'object-form-single':
      formRoot.append(buildSingleObjectForm(formStyle, responseSpec, payload));
      break;
    case 'root-widget':
      formRoot.append(buildRootWidget(formStyle, payload));
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
        el('span', { class: 'badge', text: d.spec?.code }),
        el('span', { class: 'badge', text: d.spec?.container }),
        d.isActive ? el('span', { class: 'badge', text: 'ACTIVE' }) : null
      ),
      el('h2', { text: d.name }),
      el('p', { class: 'subtitle', text: d.description || '' })
    )
  );
}

// payload 의 각 항목은 이미 hydrate 됨 (alcoholId 자리에 alcohol 객체).

// ALCOHOL_LIST — payload 가 카드 배열. 두 형태 모두 처리
//   ① 머지형: [{ alcoholId, korName, ..., comment }]              (현 hydrate 머지)
//   ② 감싸형: [{ alcohol: { alcoholId, korName, ... }, comment }] (미래 nested 응답)
function buildAlcoholCardList(formStyle, payload) {
  const initial = (Array.isArray(payload) ? payload : []).map((card) => {
    if (card?.alcohol) {
      return { alcoholId: card.alcohol.alcoholId, detail: card.alcohol, comment: card.comment };
    }
    return { alcoholId: card?.alcoholId, detail: card, comment: card?.comment };
  });
  const list = createAlcoholCardList({
    readOnly: true,
    initial,
    addLabel: formStyle.addLabel,
    commentLabel: '큐레이터 코멘트',
    commentHelper: '',
  });
  return list.element;
}

// PAIRING_LIST — payload 가 객체 폼 카드 배열
function buildObjectFormList(formStyle, responseSpec, payload) {
  const arr = Array.isArray(payload) ? payload : [];
  const layout = formStyle.viewLayout || formStyle.layout;
  return el('div', { class: 'cl-root cl-readonly' },
    el('div', { class: 'cl-list' },
      ...arr.map((item, i) =>
        el('div', { class: 'cl-card', draggable: 'false' },
          el('div', { class: 'cl-sidebar' }, el('span', { class: 'cl-number', text: String(i + 1) })),
          el('div', { class: 'cl-body' },
            buildObjectFields(layout, responseSpec, item)
          )
        )
      )
    )
  );
}

// TASTING_V1 — payload 가 단일 객체
function buildSingleObjectForm(formStyle, responseSpec, payload) {
  const layout = formStyle.viewLayout || formStyle.layout;
  return buildObjectFields(layout, responseSpec, payload);
}

// PAIRING_MATRIX — root 단일 위젯
function buildRootWidget(formStyle, payload) {
  if (formStyle.rootWidget === 'pairing-matrix') {
    // payload.alcohols 가 이미 hydrate 된 객체 배열 → pairing-matrix 가 기대하는 형태로 어댑트
    const adapted = {
      primaryAxis: payload.primaryAxis,
      items: payload.items || [],
      alcoholIds: (payload.alcohols || []).map((a) => a.alcoholId),
      links: payload.links || [],
    };
    const detailMap = {};
    (payload.alcohols || []).forEach((a) => { detailMap[a.alcoholId] = a; });
    const w = createPairingMatrix({ initial: adapted, alcoholDetailMap: detailMap, readOnly: true });
    return w.element;
  }
  return el('div', { class: 'empty', text: 'rootWidget 미지원: ' + formStyle.rootWidget });
}

// 레이아웃 기반 객체 필드 표시 (readOnly). payload 는 이미 hydrate 됨.
function buildObjectFields(layout, responseSpec, payload) {
  const props = (responseSpec?.properties) || {};
  const wrap = el('div', { class: 'cf-root' });
  const rendered = new Set();

  const renderField = (name) => {
    const schema = props[name];
    if (!schema) return null;          // spec 에 정의 없는 키는 표시 안 함 (payload 잔여물 무시)
    if (rendered.has(name)) return null;
    rendered.add(name);
    const value = payload[name];
    return el('div', { class: 'field' },
      el('label', null, schema['x-display-name'] || name),
      buildReadOnlyField(name, schema, value)
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
        if (row.children.length) section.append(row);
      });
      if (section.children.length > (group.title ? 1 : 0)) wrap.append(section);
    });
  } else {
    Object.keys(props).forEach((name) => {
      const node = renderField(name);
      if (node) wrap.append(node);
    });
  }
  return wrap;
}

// 단일 필드 readOnly 렌더. value 는 hydrate 된 형태 (alcoholId 자리에 alcohol 객체).
function buildReadOnlyField(name, schema, value) {
  const fieldKey = schema['x-field-style'];
  const fs = fieldKey ? FIELD_STYLES[fieldKey] : null;

  // alcohol-card-list — 두 형태 모두 처리
  // ① 감싸진: [{ alcohol: {...}, comment: "..." }]   (ALCOHOL_LIST·TASTING_V1)
  // ② 직접  : [{ alcoholId, korName, ... }]          (PAIRING_LIST 의 alcoholIds → alcohols)
  if (fs?.widget === 'alcohol-card-list') {
    const arr = Array.isArray(value) ? value : [];
    const initial = arr.map((card) => {
      if (card?.alcohol) {
        return { alcoholId: card.alcohol.alcoholId, detail: card.alcohol, comment: card.comment };
      }
      return { alcoholId: card?.alcoholId, detail: card, comment: card?.comment };
    });
    return createAlcoholCardList({ readOnly: true, initial, commentLabel: '코멘트' }).element;
  }
  // alcohol-card — 단일 카드
  if (fs?.widget === 'alcohol-card') {
    const detail = typeof value === 'object' ? value : null;
    const aid = detail?.alcoholId ?? (typeof value === 'number' ? value : null);
    return createAlcoholCard({
      readOnly: true,
      initial: aid != null ? { alcoholId: aid, detail } : null,
    }).element;
  }
  // notes-list
  if (fs?.widget === 'notes-list') {
    return createNotesList({
      readOnly: true, maxItems: fs.maxItems || 4,
      initial: Array.isArray(value) ? value : [],
    }).element;
  }

  // 빈 값
  if (value == null || value === '')
    return el('input', { type: 'text', class: 'cd-input', readonly: '', value: '—', disabled: '' });

  // long-text → textarea
  if (fieldKey === 'long-text') {
    const ta = el('textarea', { class: 'cd-textarea', readonly: '' });
    ta.value = String(value);
    return ta;
  }

  // 객체/배열 → JSON 박스
  if (Array.isArray(value) || typeof value === 'object')
    return el('span', { class: 'cd-plain', text: JSON.stringify(value) });

  // 타입별 input readOnly
  const t = schema.type;
  if (t === 'integer' || t === 'number') {
    return el('input', { type: 'number', class: 'cd-input', readonly: '', value: String(value) });
  }
  if (t === 'boolean') {
    return el('input', { type: 'checkbox', class: 'cd-checkbox', disabled: '', ...(value ? { checked: '' } : {}) });
  }
  if (t === 'string') {
    const fmt = schema.format;
    const inputType = fmt === 'date' ? 'date' : fmt === 'time' ? 'time' : fmt === 'uri' ? 'url' : 'text';
    return el('input', { type: inputType, class: 'cd-input', readonly: '', value: String(value) });
  }

  return el('input', { type: 'text', class: 'cd-input', readonly: '', value: String(value) });
}

function normalize(p) {
  if (p == null) return null;
  if (typeof p === 'string') {
    try { return JSON.parse(p); } catch (_) { return null; }
  }
  return p;
}
