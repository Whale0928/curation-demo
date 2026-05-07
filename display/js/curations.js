import { el, clear } from './dom.js';
import { api } from './api.js';

const root = document.getElementById('root');
const meta = document.getElementById('meta');
document.getElementById('reload').addEventListener('click', load);

load();

async function load() {
  meta.textContent = '로딩 중…';
  clear(root);
  root.append(el('div', { class: 'loading', text: '불러오는 중…' }));
  try {
    const list = await api.listCurations();
    render(list);
  } catch (e) {
    clear(root);
    root.append(el('div', { class: 'error', text: '큐레이션 조회 실패 — ' + e.message }));
    meta.textContent = '오류';
  }
}

function render(list) {
  meta.textContent = `${list.length}건 — GET /api/curations`;
  clear(root);
  if (!list.length) {
    root.append(el('div', { class: 'empty', text: '등록된 큐레이션이 없습니다.' }));
    return;
  }
  const grid = el('div', { class: 'grid' });
  list.forEach((c) => grid.append(card(c)));
  root.append(grid);
}

function card(c) {
  const cover = c.coverImageUrl
    ? el('div', { class: 'cu-cover' }, el('img', { src: c.coverImageUrl, alt: c.name }))
    : el('div', { class: 'cu-cover cu-cover-placeholder', text: '🥃' });

  const wrap = el('a', {
    href: `./curation-detail.html?id=${c.id}`,
    class: 'card cu-card',
  },
    cover,
    el('div', { class: 'card-head' },
      el('span', { class: 'badge', text: c.specCode || '' }),
      el('span', { class: 'id', text: '#' + c.id })
    ),
    el('h3', { text: c.name }),
    el('p', { class: 'desc', text: c.description || '(설명 없음)' }),
    el('div', { class: 'meta-row' },
      el('span', null, el('strong', { text: 'order' }), String(c.displayOrder ?? 0)),
      el('span', null, el('strong', { text: 'active' }), c.isActive ? 'YES' : 'NO')
    )
  );
  return wrap;
}
