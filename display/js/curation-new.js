import { el, clear } from './dom.js';
import { api } from './api.js';
import { createAlcoholSearch } from './widgets/alcohol-search.js';
import { createAlcoholCard } from './widgets/alcohol-card.js';
import { createCardList } from './widgets/card-list.js';

// 위젯 카탈로그 — 스펙의 x-widget 힌트가 가리키는 FE 컴포넌트들
const WIDGET_CATALOG = {
  'alcohol-search': (schema) =>
    createAlcoholSearch({
      mode: schema['x-widget-mode'] === 'multi' ? 'multi' : 'single',
    }),
  'alcohol-card': (schema) => createAlcoholCard(),
};

// 활성화된 위젯 인스턴스 보관 (필드명 → widget instance)
let widgetInstances = {};

// container=array 큐레이션의 카드 리스트 인스턴스 (단일)
let cardListInstance = null;

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

submitBtn.addEventListener('click', onSubmit);
resetBtn.addEventListener('click', onReset);

bootstrap();

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
}

// ─────────────────────────────────────────────────────────────
// 동적 폼 빌더 (requestSpec 의 properties 순회)
// ─────────────────────────────────────────────────────────────
function buildDynamicForm(spec) {
  dynamicTitle.textContent = `${spec.name} payload`;
  dynamicSub.textContent = `code=${spec.code} · 스펙의 requestSpec 을 따르는 데이터를 입력하세요. 서버가 JSON Schema 로 검증합니다.`;

  clear(dynamicForm);
  widgetInstances = {};
  cardListInstance = null;

  // container=array → CardListContainer
  const container = spec.container || (spec.requestSpec && spec.requestSpec['x-container']);
  if (container === 'array' && spec.requestSpec) {
    return buildCardListForm(spec);
  }

  const reqSpec = spec.requestSpec;
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

  const layout = reqSpec['x-layout'];
  if (layout && Array.isArray(layout.groups)) {
    renderLayout(layout, props, required);
  } else {
    Object.entries(props).forEach(([name, schema]) => {
      dynamicForm.append(buildField(name, schema, required.has(name)));
    });
  }
}

// container=array 스펙 — 카드 N개 컨테이너 빌드
function buildCardListForm(spec) {
  const props = spec.requestSpec.properties || {};
  // 메인 위젯 필드 찾기 (x-widget 이 박힌 첫 필드)
  const mainEntry = Object.entries(props).find(([, s]) => s['x-widget'] && WIDGET_CATALOG[s['x-widget']]);
  // 카드 본문 위젯 팩토리
  const cardFactory = mainEntry
    ? () => WIDGET_CATALOG[mainEntry[1]['x-widget']](mainEntry[1])
    : null;

  if (!cardFactory) {
    dynamicForm.append(el('div', { class: 'alert alert-error', text: '카드 본문에 사용할 x-widget 필드가 없습니다.' }));
    return;
  }

  // 코멘트 같은 부가 필드 (단일 string 필드, 카드 하단에 textarea)
  const commentEntry = Object.entries(props).find(
    ([n, s]) => n !== mainEntry[0] && s.type === 'string'
  );
  const commentFieldName = commentEntry ? commentEntry[0] : null;
  const commentLabel = commentEntry?.[1]['x-display-name'] || '큐레이터 코멘트 · 선택';
  const commentHelper = commentEntry?.[1].description || '';

  const list = createCardList({
    cardFactory,
    addLabel: '+ 위스키 추가',
    commentFieldName,
    commentLabel,
    commentHelper,
  });
  cardListInstance = list;
  dynamicForm.append(list.element);
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

  // x-widget 힌트가 있으면 카탈로그에서 위젯 사용
  const widgetKey = schema['x-widget'];
  if (widgetKey && WIDGET_CATALOG[widgetKey]) {
    const widget = WIDGET_CATALOG[widgetKey](schema);
    widgetInstances[name] = { widget, schema, isRequired };
    const help = schema.description ? el('small', { text: schema.description }) : null;
    return el('div', { class: 'field' }, label, widget.element, help);
  }

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
  // container=array → 카드 리스트에서 배열 추출
  if (cardListInstance) {
    const arr = cardListInstance.getValue().filter((v) => v && v.alcoholId != null);
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
  const coverImageUrl = document.getElementById('cur-cover').value.trim();
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
    coverImageUrl: coverImageUrl || null,
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
}

function parseIntOrZero(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
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
