import { el, clear } from './dom.js';
import { api } from './api.js';
import { createAlcoholSearch } from './widgets/alcohol-search.js';
import { createAlcoholCard } from './widgets/alcohol-card.js';
import { createCardList } from './widgets/card-list.js';
import { createPairingMatrix } from './widgets/pairing-matrix.js';
import { createAlcoholCardList } from './widgets/alcohol-card-list.js';
import { createNotesList } from './widgets/notes-list.js';
import { createPairingFoodList } from './widgets/pairing-food-list.js';
import { FORM_STYLES, FIELD_STYLES, resolveForm, resolveField } from './styles.js';
import { renderMobilePreview } from './mobile-preview.js';

// 위젯 컴포넌트 카탈로그 — FIELD_STYLES.widget 키가 여기로 연결됨
const WIDGET_FACTORY = {
  'alcohol-search':    (fs) => createAlcoholSearch({ mode: fs.mode === 'multi' ? 'multi' : 'single', onChange: updatePreview }),
  'alcohol-card':      () => createAlcoholCard({ onChange: updatePreview }),
  'alcohol-card-list': () => createAlcoholCardList({ onChange: updatePreview }),
  'pairing-food-list': (fs) => createPairingFoodList({ onChange: updatePreview }),
  'notes-list':        (fs) => createNotesList({ maxItems: fs?.maxItems || 4 }),
  'pairing-matrix':    () => createPairingMatrix(),
  'image-upload':      null, // 미구현 → text fallback
};

// 활성화된 위젯 인스턴스 보관 (필드명 → widget instance)
let widgetInstances = {};

// container=array 큐레이션의 카드 리스트 인스턴스 (단일)
let cardListInstance = null;

// container=object + root x-widget 인 경우 root 단일 위젯 인스턴스
let rootWidgetInstance = null;

// ─────────────────────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────────────────────
let specs = [];
let selectedSpec = null;

const specPicker = document.getElementById('spec-picker');
const dynamicForm = document.getElementById('dynamic-form');
const dynamicTitle = document.getElementById('dynamic-title');
const dynamicSub = document.getElementById('dynamic-sub');
const alertBox = document.getElementById('alert');
const submitBtn = document.getElementById('submit');
const resetBtn = document.getElementById('reset');
const mobilePreview = document.getElementById('mobile-preview');

submitBtn.addEventListener('click', onSubmit);
resetBtn.addEventListener('click', onReset);
document.getElementById('curation-form').addEventListener('input', updatePreview);
document.getElementById('curation-form').addEventListener('change', updatePreview);

bootstrap();
updatePreview();

async function bootstrap() {
  try {
    specs = await api.listSpecs();
    renderSpecPicker();
  } catch (e) {
    showAlert('error', '스펙 목록 조회 실패', [e.message]);
  }
}

// ─────────────────────────────────────────────────────────────
// 스펙 선택 UI
// ─────────────────────────────────────────────────────────────
function renderSpecPicker() {
  clear(specPicker);
  specs.forEach(s => {
    const opt = el('div', {
      class: 'spec-option',
      onClick: () => selectSpec(s),
    },
      el('span', { class: 'badge', text: s.code }),
      el('strong', { text: s.name }),
      el('small', { text: s.description || '' })
    );
    opt.dataset.specId = s.id;
    specPicker.append(opt);
  });
}

function selectSpec(spec) {
  selectedSpec = spec;
  document.querySelectorAll('.spec-option').forEach(o => {
    o.classList.toggle('selected', Number(o.dataset.specId) === spec.id);
  });
  buildDynamicForm(spec);
  updatePreview();
}

// ─────────────────────────────────────────────────────────────
// 동적 폼 빌더 (requestSpec 의 properties 순회)
// ─────────────────────────────────────────────────────────────
function buildDynamicForm(spec) {
  dynamicTitle.textContent = dynamicSectionTitle(spec);
  dynamicSub.textContent = dynamicSectionSub(spec);

  clear(dynamicForm);
  widgetInstances = {};
  cardListInstance = null;
  rootWidgetInstance = null;

  const reqSpec = spec.requestSpec;
  if (!reqSpec) {
    dynamicForm.append(el('div', { class: 'alert alert-error', text: 'requestSpec 이 없습니다.' }));
    return;
  }

  // x-form-style 카탈로그 lookup
  const formStyle = resolveForm(reqSpec);
  if (formStyle) dynamicForm.classList.add(formStyle.cssClass || '');

  const container = spec.container || reqSpec['x-container'];

  // root 단일 위젯 모드 (pairing-matrix 등)
  if (formStyle?.cardMode === 'root-widget' && WIDGET_FACTORY[formStyle.rootWidget]) {
    const widget = WIDGET_FACTORY[formStyle.rootWidget]();
    rootWidgetInstance = widget;
    dynamicForm.append(widget.element);
    updatePreview();
    return;
  }

  // container=array → CardListContainer
  if (container === 'array') {
    return buildCardListForm(spec, formStyle);
  }
  if (!reqSpec || typeof reqSpec !== 'object') {
    dynamicForm.append(el('div', { class: 'alert alert-error', text: 'requestSpec 이 없거나 잘못된 형식입니다.' }));
    return;
  }
  const props = reqSpec.properties || {};
  const required = new Set(reqSpec.required || []);

  if (!Object.keys(props).length) {
    dynamicForm.append(el('div', { class: 'alert', text: 'requestSpec 에 properties 가 없습니다.' }));
    return;
  }

  // 폼 패턴이 layout 을 들고 있으면 그것을 우선 사용 (스펙엔 layout 객체 없음)
  const layout = formStyle?.layout;
  if (layout && Array.isArray(layout.groups)) {
    renderLayout(layout, props, required);
  } else {
    Object.entries(props).forEach(([name, schema]) => {
      dynamicForm.append(buildField(name, schema, required.has(name)));
    });
  }
  updatePreview();
}

function dynamicSectionTitle(spec) {
  if (spec.code === 'RECOMMENDED_WHISKY') return '2 위스키';
  if (spec.code === 'WHISKY_PAIRING') return '2 위스키, 음식';
  if (spec.code === 'WHISKY_TASTING_EVENT') return '2 날짜 및 장소 · 3 참가 정보 · 4 시음 위스키';
  return `${spec.name} payload`;
}

function dynamicSectionSub(spec) {
  if (spec.code === 'RECOMMENDED_WHISKY') return '큐레이션에 노출할 위스키를 입력해주세요.';
  if (spec.code === 'WHISKY_PAIRING') return '위스키에 어울리는 음식을 입력해주세요.';
  if (spec.code === 'WHISKY_TASTING_EVENT') return '실제 장소와 참가 정보, 시음 위스키를 입력해주세요.';
  return `code=${spec.code} · 서버가 JSON Schema 로 검증합니다.`;
}

// container=array 스펙 — 카드 N개 컨테이너 빌드
function buildCardListForm(spec, formStyle) {
  const reqSpec = spec.requestSpec;
  const props = reqSpec.properties || {};
  const required = new Set(reqSpec.required || []);

  // 모드 1: rich-with-comment — 단일 카드 위젯 + 옵션 코멘트 textarea
  if (formStyle?.cardMode === 'rich-with-comment') {
    const cardWidgetKey = formStyle.cardWidget;
    const commentField  = formStyle.commentField;
    if (!WIDGET_FACTORY[cardWidgetKey]) {
      dynamicForm.append(el('div', { class: 'alert alert-error', text: `cardWidget(${cardWidgetKey}) 미등록` }));
      return;
    }
    const commentSchema = commentField ? props[commentField] : null;
    const list = createCardList({
      cardFactory: () => richCardFactory(cardWidgetKey),
      addLabel: formStyle.addLabel || '+ 추가',
      commentFieldName: commentField || null,
      commentLabel: commentSchema?.['x-display-name'] || '큐레이터 코멘트 · 선택',
      commentHelper: commentSchema?.description || '',
      onChange: updatePreview,
    });
    cardListInstance = list;
    dynamicForm.append(list.element);
    updatePreview();
    return;
  }

  // 모드 2: object-form — 스펙의 모든 properties 를 카드 안에 폼으로 렌더
  const layout = formStyle?.layout;
  const list = createCardList({
    cardFactory: () => objectFormCardFactory(props, required, layout),
    addLabel: formStyle?.addLabel || '+ 추가',
    onChange: updatePreview,
  });
  cardListInstance = list;
  dynamicForm.append(list.element);
  updatePreview();
}

// 풍부 카드 — 메인 위젯 1개 (CardList 가 commentField 머지)
function richCardFactory(cardWidgetKey) {
  const widget = WIDGET_FACTORY[cardWidgetKey]();
  return {
    element: widget.element,
    getValue() {
      const v = widget.getValue();
      // alcohol-card 는 {alcoholId, comment} 반환 → 그대로
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
      return { value: v };
    },
    isEmpty() { return widget.isEmpty(); },
  };
}

// 객체 폼 카드 — 스펙의 모든 properties 를 자체 폼으로 (x-layout 적용)
function objectFormCardFactory(props, required, layout) {
  const wrap = el('div', { class: 'cf-root' });
  const local = {}; // 필드별 위젯 인스턴스 또는 input
  const used = new Set();

  const renderField = (name) => {
    const schema = props[name];
    if (!schema) return null;
    used.add(name);
    const fieldStyle = resolveField(schema);
    if (fieldStyle?.widget && WIDGET_FACTORY[fieldStyle.widget]) {
      const widget = WIDGET_FACTORY[fieldStyle.widget](fieldStyle);
      local[name] = { type: 'widget', widget };
      return buildLabeledField(name, schema, required.has(name), widget.element);
    }
    const input = buildInput(`cf-${name}`, name, schema);
    if (required.has(name)) input.setAttribute('required', '');
    const valueInput = schema.type === 'boolean' ? input.querySelector('input[type="checkbox"]') : input;
    local[name] = { type: 'input', input: valueInput || input, schema };
    return buildLabeledField(name, schema, required.has(name), input);
  };

  if (layout && Array.isArray(layout.groups)) {
    layout.groups.forEach((group) => {
      const section = el('div', { class: 'cf-section' });
      if (group.title) section.append(el('div', { class: 'cf-section-title', text: group.title }));
      (group.rows || []).forEach((rowFields) => {
        const cols = rowFields.length;
        const row = el('div', {
          class: 'cf-row',
          style: `grid-template-columns: repeat(${cols}, 1fr);`,
        });
        rowFields.forEach((name) => {
          const node = renderField(name);
          if (node) row.append(node);
        });
        section.append(row);
      });
      wrap.append(section);
    });
    // layout 누락 필드 fallback
    Object.keys(props).forEach((name) => {
      if (!used.has(name)) {
        const node = renderField(name);
        if (node) wrap.append(node);
      }
    });
  } else {
    Object.keys(props).forEach((name) => {
      const node = renderField(name);
      if (node) wrap.append(node);
    });
  }

  return {
    element: wrap,
    getValue() {
      const obj = {};
      Object.entries(local).forEach(([name, h]) => {
        if (h.type === 'widget') {
          if (!h.widget.isEmpty()) {
            const value = h.widget.getValue();
            obj[name] = name === 'alcoholId' && value && typeof value === 'object' ? value.alcoholId : value;
          }
        } else {
          const t = h.schema.type;
          if (t === 'boolean') obj[name] = h.input.checked;
          else {
            const v = h.input.value.trim();
            if (v === '') return;
            if (t === 'integer') obj[name] = parseInt(v, 10);
            else if (t === 'number') obj[name] = parseFloat(v);
            else if (t === 'array' || t === 'object') {
              try { obj[name] = JSON.parse(v); } catch (_) { obj[name] = v; }
            } else obj[name] = v;
          }
        }
      });
      return obj;
    },
    getPreviewValue() {
      const obj = {};
      Object.entries(local).forEach(([name, h]) => {
        if (h.type === 'widget') {
          if (h.widget.isEmpty()) return;
          const value = h.widget.getValue();
          obj[name] = name === 'alcoholId' && value && typeof value === 'object' ? value.alcoholId : value;
          const preview = h.widget.getPreviewValue?.();
          if (name === 'alcoholIds') obj.alcohols = Array.isArray(preview) ? preview : [];
          else if (name === 'alcoholId' && preview && typeof preview === 'object') Object.assign(obj, preview);
          else if (preview != null) obj[name] = preview;
        } else {
          const t = h.schema.type;
          if (t === 'boolean') obj[name] = h.input.checked;
          else {
            const v = h.input.value.trim();
            if (v === '') return;
            if (t === 'integer') obj[name] = parseInt(v, 10);
            else if (t === 'number') obj[name] = parseFloat(v);
            else if (t === 'array' || t === 'object') {
              try { obj[name] = JSON.parse(v); } catch (_) { obj[name] = v; }
            } else obj[name] = v;
          }
        }
      });
      return obj;
    },
    isEmpty() {
      const v = this.getValue();
      return Object.keys(v).length === 0;
    },
  };
}

function updatePreview() {
  if (!mobilePreview) return;
  updateCommonImagePreviews();
  const draft = {
    spec: selectedSpec ? { code: selectedSpec.code, container: selectedSpec.container } : null,
    name: document.getElementById('cur-name')?.value.trim() || '',
    description: document.getElementById('cur-desc')?.value.trim() || '',
    imageUrls: readImageUrls(),
    coverImageUrl: readImageUrls()[0] || '',
    payload: selectedSpec ? readPreviewPayload(selectedSpec) : null,
  };
  renderMobilePreview(mobilePreview, draft, { mode: 'input' });
}

function readPreviewPayload(spec) {
  if (rootWidgetInstance) return rootWidgetInstance.getValue();
  if (cardListInstance) {
    const reader = cardListInstance.getPreviewValue || cardListInstance.getValue;
    return reader.call(cardListInstance).filter((v) => v && Object.keys(v).length > 0);
  }

  const props = spec.requestSpec.properties || {};
  const payload = {};
  Object.entries(props).forEach(([name, schema]) => {
    if (widgetInstances[name]) {
      const { widget } = widgetInstances[name];
      if (widget.isEmpty()) return;
      const value = widget.getValue();
      payload[name] = name === 'alcoholId' && value && typeof value === 'object' ? value.alcoholId : value;
      const preview = widget.getPreviewValue?.();
      if (name === 'alcoholId' && preview && typeof preview === 'object') Object.assign(payload, preview);
      else if (preview != null && name !== 'alcoholId') payload[name] = preview;
      return;
    }
    const input = dynamicForm.querySelector(`[name="${name}"]`);
    if (!input) return;
    const t = schema.type;
    if (t === 'boolean') {
      payload[name] = input.checked;
      return;
    }
    const raw = input.value.trim();
    if (!raw) return;
    try {
      if (t === 'integer') payload[name] = parseInt(raw, 10);
      else if (t === 'number') payload[name] = parseFloat(raw);
      else if (t === 'array' || t === 'object') payload[name] = JSON.parse(raw);
      else payload[name] = raw;
    } catch (_) {
      payload[name] = raw;
    }
  });
  return payload;
}

function buildLabeledField(name, schema, isRequired, controlEl) {
  const labelText = schema['x-display-name'] || schema.title || name;
  const label = el('label', null, labelText);
  if (isRequired) label.append(el('span', { class: 'req', text: '*' }));
  const help = schema.description ? el('small', { text: schema.description }) : null;
  return el('div', { class: 'field' }, label, controlEl, help);
}

// x-layout.groups 기반 렌더 — 누락 필드는 마지막에 자동 추가
function renderLayout(layout, props, required) {
  const used = new Set();

  layout.groups.forEach(group => {
    const section = el('div', { class: 'field-section' });
    if (group.title) {
      section.append(el('div', { class: 'field-section-title', text: group.title }));
    }
    (group.rows || []).forEach(rowFields => {
      const cols = rowFields.length;
      const row = el('div', { class: 'field-row', style: `grid-template-columns: repeat(${cols}, 1fr);` });
      rowFields.forEach(name => {
        const schema = props[name];
        if (!schema) return; // 스키마에 없는 필드 무시
        used.add(name);
        row.append(buildField(name, schema, required.has(name)));
      });
      section.append(row);
    });
    dynamicForm.append(section);
  });

  // layout 에서 누락된 필드는 마지막 fallback section
  const leftover = Object.entries(props).filter(([n]) => !used.has(n));
  if (leftover.length) {
    const section = el('div', { class: 'field-section' });
    section.append(el('div', { class: 'field-section-title', text: '기타' }));
    leftover.forEach(([name, schema]) => {
      section.append(buildField(name, schema, required.has(name)));
    });
    dynamicForm.append(section);
  }
}

function buildField(name, schema, isRequired) {
  const id = `f-${name}`;
  const labelText = schema['x-display-name'] || schema.title || name;
  const label = el('label', { for: id }, labelText);
  if (isRequired) label.append(el('span', { class: 'req', text: '*' }));

  // x-field-style 카탈로그 lookup
  const fieldStyle = resolveField(schema);
  if (fieldStyle?.widget && WIDGET_FACTORY[fieldStyle.widget]) {
    const widget = WIDGET_FACTORY[fieldStyle.widget](fieldStyle);
    widgetInstances[name] = { widget, schema, isRequired };
    const help = schema.description ? el('small', { text: schema.description }) : null;
    return el('div', { class: 'field' }, label, widget.element, help);
  }

  // 위젯 fallback — 일반 input
  const input = buildInput(id, name, schema);
  if (isRequired) input.setAttribute('required', '');
  const help = schema.description ? el('small', { text: schema.description }) : null;
  return el('div', { class: 'field' }, label, input, help);
}

function buildInput(id, name, schema) {
  const t = schema.type;

  if (t === 'boolean') {
    const cb = el('input', { type: 'checkbox', id, name });
    if (schema.default === true) cb.checked = true;
    return el('div', { class: 'checkbox-row' }, cb,
      el('span', { text: schema.default === true ? '(기본 ON)' : '' })
    );
  }

  if (t === 'string') {
    if (schema['x-field-style'] === 'long-text') {
      const props = { id, name };
      if (schema.example != null) props.placeholder = String(schema.example);
      return el('textarea', props);
    }
    const fmt = schema.format;
    const type = fmt === 'date' ? 'date' : fmt === 'time' ? 'time' : fmt === 'uri' ? 'url' : 'text';
    const props = { type, id, name };
    if (schema.example != null) props.placeholder = String(schema.example);
    return el('input', props);
  }

  if (t === 'integer' || t === 'number') {
    const props = { type: 'number', id, name };
    if (t === 'number') props.step = 'any';
    if (schema.minimum != null) props.min = String(schema.minimum);
    if (schema.example != null) props.placeholder = String(schema.example);
    return el('input', props);
  }

  // array / object → raw JSON 입력 (데모 단순화)
  return el('textarea', {
    id, name,
    placeholder: t === 'array'
      ? '[1, 2, 3] 형태의 JSON 배열'
      : '{ "key": "value" } 형태의 JSON 객체',
  });
}

// ─────────────────────────────────────────────────────────────
// 폼 → JSON payload 추출
// ─────────────────────────────────────────────────────────────
function readPayload(spec) {
  // container=object + root 단일 위젯 (예: pairing-matrix)
  if (rootWidgetInstance) {
    if (rootWidgetInstance.isEmpty()) return { payload: null, errors: ['위젯에 데이터를 입력하세요.'] };
    return { payload: rootWidgetInstance.getValue(), errors: [] };
  }

  // container=array → 카드 리스트에서 배열 추출
  if (cardListInstance) {
    const arr = cardListInstance.getValue().filter((v) => v && Object.keys(v).length > 0);
    if (!arr.length) return { payload: null, errors: ['카드를 1개 이상 추가하세요.'] };
    return { payload: arr, errors: [] };
  }

  const props = spec.requestSpec.properties || {};
  const required = new Set(spec.requestSpec.required || []);
  const payload = {};
  const errors = [];

  Object.entries(props).forEach(([name, schema]) => {
    // 위젯이 있으면 위젯에서 값 추출
    if (widgetInstances[name]) {
      const { widget, isRequired } = widgetInstances[name];
      if (widget.isEmpty()) {
        if (isRequired) errors.push(`${name}: 필수값 누락 (위젯)`);
        return;
      }
      payload[name] = widget.getValue();
      return;
    }

    const input = dynamicForm.querySelector(`[name="${name}"]`);
    if (!input) return;
    const t = schema.type;

    if (t === 'boolean') {
      payload[name] = input.checked;
      return;
    }

    const raw = input.value.trim();
    if (raw === '') {
      if (required.has(name)) errors.push(`${name}: 필수값 누락`);
      return;
    }

    try {
      if (t === 'integer') payload[name] = parseInt(raw, 10);
      else if (t === 'number') payload[name] = parseFloat(raw);
      else if (t === 'array' || t === 'object') payload[name] = JSON.parse(raw);
      else payload[name] = raw;
    } catch (e) {
      errors.push(`${name}: JSON 파싱 실패 (${e.message})`);
    }
  });

  return { payload, errors };
}

// ─────────────────────────────────────────────────────────────
// 제출
// ─────────────────────────────────────────────────────────────
async function onSubmit() {
  hideAlert();
  if (!selectedSpec) {
    showAlert('error', '스펙을 먼저 선택하세요.', []);
    return;
  }

  const name = document.getElementById('cur-name').value.trim();
  if (!name) {
    showAlert('error', '큐레이션 이름은 필수입니다.', []);
    return;
  }

  const description = document.getElementById('cur-desc').value.trim();
  if (!description) {
    showAlert('error', '큐레이션 내용은 필수입니다.', []);
    return;
  }
  const imageUrls = readImageUrls();
  if (!imageUrls.length) {
    showAlert('error', '이미지는 최소 1장 이상 필요합니다.', []);
    return;
  }
  const exposureStartDate = normalizeDate(document.getElementById('cur-exposure-start').value.trim());
  const exposureEndDate = normalizeDate(document.getElementById('cur-exposure-end').value.trim());
  if (!exposureStartDate || !exposureEndDate) {
    showAlert('error', '노출기간은 YYYY.MM.DD 또는 YYYY-MM-DD 형식으로 입력하세요.', []);
    return;
  }
  const displayOrder = parseIntOrZero(document.getElementById('cur-order').value);
  const isActive = document.getElementById('cur-active').checked;

  const { payload, errors } = readPayload(selectedSpec);
  if (errors.length) {
    showAlert('error', '입력값을 확인하세요.', errors);
    return;
  }

  const body = {
    specId: selectedSpec.id,
    name,
    description: description || null,
    coverImageUrl: imageUrls[0] || null,
    imageUrls,
    exposureStartDate,
    exposureEndDate,
    displayOrder,
    isActive,
    payload,
  };

  submitBtn.disabled = true;
  try {
    const res = await api.createCuration(body);
    showAlert('success', `등록 성공 — id=${res.id}`, [
      `spec=${selectedSpec.code}, name="${name}"`,
    ]);
  } catch (e) {
    const msg = e.body?.message || e.message;
    const errs = e.body?.errors || [];
    showAlert('error', msg, errs);
  } finally {
    submitBtn.disabled = false;
  }
}

function onReset() {
  document.getElementById('curation-form').reset();
  selectedSpec = null;
  document.querySelectorAll('.spec-option').forEach(o => o.classList.remove('selected'));
  clear(dynamicForm);
  dynamicTitle.textContent = '스펙을 선택하면 동적 폼이 렌더됩니다';
  dynamicSub.textContent = '';
  hideAlert();
  updatePreview();
}

function parseIntOrZero(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function readImageUrls() {
  return ['cur-image-1', 'cur-image-2', 'cur-image-3']
    .map((id) => document.getElementById(id)?.value.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function updateCommonImagePreviews() {
  ['cur-image-1', 'cur-image-2', 'cur-image-3'].forEach((id) => {
    const input = document.getElementById(id);
    const box = document.querySelector(`[data-preview-for="${id}"]`);
    if (!input || !box) return;
    const url = input.value.trim();
    clear(box);
    if (url) {
      box.append(el('img', { src: url, alt: input.placeholder || '큐레이션 이미지' }));
    } else {
      const label = id === 'cur-image-1' ? '대표 이미지 미리보기' : `이미지 ${id.slice(-1)} 미리보기`;
      box.append(el('span', { text: label }));
    }
  });
}

function normalizeDate(value) {
  if (!value) return null;
  const normalized = value.replaceAll('.', '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

// ─────────────────────────────────────────────────────────────
// 알림
// ─────────────────────────────────────────────────────────────
function showAlert(kind, title, errors) {
  clear(alertBox);
  alertBox.className = `alert alert-${kind}`;
  alertBox.append(el('strong', { text: title }));
  if (errors && errors.length) {
    const ul = el('ul');
    errors.forEach(msg => ul.append(el('li', { text: msg })));
    alertBox.append(ul);
  }
  alertBox.style.display = 'block';
}

function hideAlert() {
  alertBox.style.display = 'none';
  clear(alertBox);
}
