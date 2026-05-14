import { el, clear } from './dom.js';
import { api } from './api.js';
import { FORM_STYLES, FIELD_STYLES } from './styles.js';
import { createAlcoholCard } from './widgets/alcohol-card.js';
import { createAlcoholCardList } from './widgets/alcohol-card-list.js';
import { createNotesList } from './widgets/notes-list.js';
import { createPairingMatrix } from './widgets/pairing-matrix.js';
import { createPairingFoodList } from './widgets/pairing-food-list.js';
import { renderMobilePreview } from './mobile-preview.js';

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

  const layout = el('div', { class: 'demo-workspace detail-workspace' });
  const board = el('div', { class: 'demo-editor detail-board' });
  const phoneStage = el('aside', { class: 'phone-stage' },
    el('div', { class: 'phone-stage-head' },
      el('strong', { text: '모바일 화면' }),
      el('span', { text: '조회 응답 기준' })
    ),
    el('div', { id: 'mobile-preview' })
  );
  layout.append(board, phoneStage);
  root.append(layout);

  const responseSpec = normalize(d.spec?.responseSpec);
  const payload = normalize(d.payload);
  renderMobilePreview(phoneStage.querySelector('#mobile-preview'), d, { mode: 'detail' });

  const detailForm = el('form', { class: 'detail-form', onsubmit: 'event.preventDefault();' });
  detailForm.append(renderSpecSection(d), renderBasicInfoSection(d));
  board.append(detailForm);

  const formKey = responseSpec?.['x-form-style'];
  const formStyle = formKey ? FORM_STYLES[formKey] : null;
  const payloadSection = renderPayloadSection(d, responseSpec, payload, formStyle);
  detailForm.append(payloadSection);

  if (!payload) {
    payloadSection.querySelector('.detail-dynamic-form').append(el('div', { class: 'empty', text: 'payload 가 없습니다.' }));
    return;
  }
  if (!formStyle) {
    payloadSection.querySelector('.detail-dynamic-form').append(el('div', { class: 'empty', text: `폼 스타일을 찾을 수 없음: ${formKey}` }));
    return;
  }

  const formRoot = el('div', { class: 'cd-form ' + (formStyle.cssClass || '') });
  payloadSection.querySelector('.detail-dynamic-form').append(formRoot);

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

function renderSpecSection(d) {
  return el('section', { class: 'form-section detail-spec-section' },
    el('h3', { text: '큐레이션 유형 선택' }),
    el('div', { class: 'section-sub', text: '등록 시 선택한 큐레이션 양식입니다.' }),
    el('div', { class: 'spec-picker spec-picker-readonly' },
      el('div', { class: 'spec-option selected readonly' },
        el('span', { class: 'badge', text: d.spec?.code || '-' }),
        el('strong', { text: d.spec?.name || '스펙 정보 없음' }),
        el('small', { text: `container=${d.spec?.container || '-'} · id=${d.spec?.id || '-'}` })
      )
    )
  );
}

function renderBasicInfoSection(d) {
  const images = normalizedImages(d);
  return el('section', { class: 'form-section' },
    el('h3', { text: '1. 기본정보' }),
    el('div', { class: 'section-sub', text: '앱 화면 상단에 노출되는 제목, 설명, 대표 이미지 정보.' }),

    el('div', { class: 'field' },
      el('label', { for: 'detail-cur-name' }, '큐레이션명 ', el('span', { class: 'req', text: '*' })),
      readOnlyInput('text', 'detail-cur-name', d.name || '')
    ),

    el('div', { class: 'field' },
      el('label', { for: 'detail-cur-desc' }, '큐레이션 내용 ', el('span', { class: 'req', text: '*' })),
      readOnlyTextarea('detail-cur-desc', d.description || '')
    ),

    el('div', { class: 'field' },
      el('label', null, '이미지(3장) ', el('span', { class: 'req', text: '*' })),
      el('div', { class: 'image-upload-zone detail-upload-zone' },
        images[0]
          ? el('img', { src: images[0], alt: d.name || '큐레이션 이미지' })
          : el('div', { class: 'upload-icon', text: '↑' }),
        el('strong', { text: images[0] ? '등록된 대표 이미지' : '이미지 없음' }),
        el('span', { text: '조회 모드에서는 이미지를 변경하지 않습니다.' })
      ),
      el('div', { class: 'curation-image-list' },
        renderCurationImageItem('detail-cur-image-1', '대표 이미지 URL', images[0]),
        renderCurationImageItem('detail-cur-image-2', '이미지 URL 2', images[1]),
        renderCurationImageItem('detail-cur-image-3', '이미지 URL 3', images[2])
      )
    ),

    el('div', { class: 'form-note', text: '* 모집기간동안 보틀노트 앱에서 노출됩니다.' }),

    el('div', { class: 'date-range-row' },
      el('div', { class: 'field' },
        el('label', { for: 'detail-cur-exposure-start' }, '노출기간 시작일 ', el('span', { class: 'req', text: '*' })),
        readOnlyInput('text', 'detail-cur-exposure-start', displayDate(d.exposureStartDate))
      ),
      el('span', { class: 'range-mark', text: '~' }),
      el('div', { class: 'field' },
        el('label', { for: 'detail-cur-exposure-end' }, '노출기간 종료일 ', el('span', { class: 'req', text: '*' })),
        readOnlyInput('text', 'detail-cur-exposure-end', displayDate(d.exposureEndDate))
      )
    ),

    el('div', { class: 'field order-field' },
      el('label', { for: 'detail-cur-order' }, '노출순서(관리자 전용) ', el('span', { class: 'req', text: '*' })),
      readOnlyInput('number', 'detail-cur-order', String(d.displayOrder ?? 0))
    ),

    el('div', { class: 'field' },
      el('div', { class: 'checkbox-row toggle-row' },
        readOnlyCheckbox('detail-cur-active', Boolean(d.isActive)),
        el('span', { text: '활성화 상태(관리자 적용)' })
      )
    )
  );
}

function renderPayloadSection(d, responseSpec, payload, formStyle) {
  return el('section', { class: 'form-section' },
    el('h3', { text: dynamicSectionTitle(d.spec) }),
    el('div', { class: 'section-sub', text: dynamicSectionSub(d.spec) }),
    el('div', { class: 'detail-dynamic-form ' + (formStyle?.cssClass || '') })
  );
}

function dynamicSectionTitle(spec) {
  if (spec?.code === 'RECOMMENDED_WHISKY') return '2 위스키';
  if (spec?.code === 'WHISKY_PAIRING') return '2 위스키, 음식';
  if (spec?.code === 'WHISKY_TASTING_EVENT') return '2 날짜 및 장소 · 3 참가 정보 · 4 시음 위스키';
  return `${spec?.name || 'payload'} payload`;
}

function dynamicSectionSub(spec) {
  if (spec?.code === 'RECOMMENDED_WHISKY') return '큐레이션에 노출되는 위스키입니다.';
  if (spec?.code === 'WHISKY_PAIRING') return '위스키에 어울리는 음식 정보입니다.';
  if (spec?.code === 'WHISKY_TASTING_EVENT') return '실제 장소와 참가 정보, 시음 위스키입니다.';
  return `code=${spec?.code || '-'} · 저장된 응답 payload 기준`;
}

function normalizedImages(d) {
  const urls = Array.isArray(d.imageUrls) ? d.imageUrls : [];
  const merged = [...urls];
  if (!merged.length && d.coverImageUrl) merged.push(d.coverImageUrl);
  return [0, 1, 2].map((i) => merged[i] || '');
}

function readOnlyInput(type, id, value) {
  return el('input', { type, id, value: value || '', readonly: '' });
}

function readOnlyTextarea(id, value) {
  const ta = el('textarea', { id, readonly: '' });
  ta.value = value || '';
  return ta;
}

function readOnlyCheckbox(id, checked) {
  return el('input', { type: 'checkbox', id, disabled: '', ...(checked ? { checked: '' } : {}) });
}

function renderCurationImageItem(id, placeholder, url) {
  const src = url || '';
  return el('div', { class: 'curation-image-item' },
    el('div', { class: 'image-url-preview-box' },
      src
        ? el('img', { src, alt: placeholder })
        : el('span', { text: placeholder.replace('URL', '미리보기') })
    ),
    readOnlyInput('url', id, src)
  );
}

function displayDate(value) {
  return value ? String(value).replaceAll('-', '.') : '';
}

function buildAlcoholCardList(formStyle, payload) {
  const list = createAlcoholCardList({
    readOnly: true,
    initial: Array.isArray(payload) ? payload : [],
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
    const value = name === 'alcohol' ? payload : payload[name];
    const label = shouldHideReadOnlyLabel(schema)
      ? null
      : el('label', null, schema['x-display-name'] || name);
    return el('div', { class: 'field' },
      label,
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

function shouldHideReadOnlyLabel(schema) {
  const fieldKey = schema?.['x-field-style'];
  const fs = fieldKey ? FIELD_STYLES[fieldKey] : null;
  return ['alcohol-card', 'alcohol-card-list', 'pairing-food-list'].includes(fs?.widget);
}

// 단일 필드 readOnly 렌더. value 는 hydrate 된 형태 (alcoholId 자리에 alcohol 객체).
function buildReadOnlyField(name, schema, value) {
  const fieldKey = schema['x-field-style'];
  const fs = fieldKey ? FIELD_STYLES[fieldKey] : null;

  if (fs?.widget === 'alcohol-card-list') {
    const arr = Array.isArray(value) ? value : [];
    return createAlcoholCardList({ readOnly: true, initial: arr, commentLabel: '코멘트' }).element;
  }
  // alcohol-card — 단일 카드
  if (fs?.widget === 'alcohol-card') {
    return createAlcoholCard({
      readOnly: true,
      initial: value && typeof value === 'object' ? value : null,
    }).element;
  }
  // notes-list
  if (fs?.widget === 'notes-list') {
    return createNotesList({
      readOnly: true, maxItems: fs.maxItems || 4,
      initial: Array.isArray(value) ? value : [],
    }).element;
  }
  if (fs?.widget === 'pairing-food-list') {
    return createPairingFoodList({
      readOnly: true,
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
  if (fieldKey === 'image-url') {
    return renderImageUrlField(value, schema['x-display-name'] || name);
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
    if (fmt === 'date') {
      return el('input', { type: 'text', class: 'cd-input', readonly: '', value: displayDate(value) });
    }
    const inputType = fmt === 'time' ? 'time' : fmt === 'uri' ? 'url' : 'text';
    return el('input', { type: inputType, class: 'cd-input', readonly: '', value: String(value) });
  }

  return el('input', { type: 'text', class: 'cd-input', readonly: '', value: String(value) });
}

function renderImageUrlField(value, label) {
  const url = value == null ? '' : String(value);
  return el('div', { class: 'image-url-preview-field' },
    el('div', { class: 'image-url-preview-box' },
      url
        ? el('img', { src: url, alt: label || '이미지 미리보기' })
        : el('span', { text: '이미지 없음' })
    ),
    el('input', { type: 'url', class: 'cd-input', readonly: '', value: url })
  );
}

function normalize(p) {
  if (p == null) return null;
  if (typeof p === 'string') {
    try { return JSON.parse(p); } catch (_) { return null; }
  }
  return p;
}
