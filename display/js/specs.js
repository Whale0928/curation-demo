import { el, clear } from './dom.js';
import { api } from './api.js';

const root = document.getElementById('root');
const meta = document.getElementById('meta');
document.getElementById('reload').addEventListener('click', load);

load();

async function load() {
  showLoading();
  try {
    const list = await api.listSpecs();
    render(list);
  } catch (e) {
    showError(e.message);
  }
}

function showLoading() {
  meta.textContent = '로딩 중…';
  clear(root);
  root.append(el('div', { class: 'loading', text: '불러오는 중…' }));
}

function showError(msg) {
  meta.textContent = '오류';
  clear(root);
  root.append(
    el('div', { class: 'error' },
      el('div', { text: `스펙 조회 실패 — ${msg}` }),
      el('div', { text: 'API 서버(20081)가 떠있는지 확인하세요.' })
    )
  );
}

function render(list) {
  meta.textContent = `${list.length}건 — GET /api/specs`;
  clear(root);
  if (!list.length) {
    root.append(el('div', { class: 'empty', text: '등록된 스펙이 없습니다.' }));
    return;
  }
  const grid = el('div', { class: 'grid' });
  list.forEach(s => grid.append(renderCard(s)));
  root.append(grid);
}

function renderCard(s) {
  const reqProps = countProps(s.requestSpec);
  const resProps = countProps(s.responseSpec);

  const card = el('article', { class: 'card' },
    el('div', { class: 'card-head' },
      el('span', { class: 'badge', text: s.code }),
      el('span', { class: 'id', text: `#${s.id}` })
    ),
    el('h3', { text: s.name }),
    el('p', { class: 'desc', text: s.description || '(설명 없음)' }),
    el('div', { class: 'meta-row' },
      metaItem('hydrator', s.hydratorKey),
      metaItem('req fields', reqProps),
      metaItem('res fields', resProps)
    ),
    schemaDetails('requestSpec 보기', s.requestSpec),
    schemaDetails('responseSpec 보기', s.responseSpec)
  );
  return card;
}

function metaItem(label, value) {
  return el('span', null,
    el('strong', { text: label }),
    String(value)
  );
}

function schemaDetails(summaryText, schema) {
  return el('details', null,
    el('summary', { text: summaryText }),
    el('pre', { text: JSON.stringify(schema ?? {}, null, 2) })
  );
}

function countProps(schema) {
  try {
    return Object.keys(schema?.properties ?? {}).length;
  } catch (_) {
    return '-';
  }
}
