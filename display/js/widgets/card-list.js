import { el, clear } from '../dom.js';

/**
 * CardListContainer
 * - container=array 큐레이션의 카드 N개 반복
 * - + 추가 / 🗑️ 삭제 / ⋮⋮ 드래그 (readOnly 시 모두 숨김)
 *
 * cardFactory(initialItem) → { element, getValue(), isEmpty(), setComment? }
 * commentFieldName: 카드 하단 textarea 가 머지할 필드명
 *
 * options:
 *   - readOnly: true 시 추가/삭제/드래그/입력 모두 비활성
 *   - initial: 카드 N개를 미리 채우는 데이터 배열
 */
export function createCardList({
  cardFactory,
  addLabel = '+ 추가',
  commentFieldName = null,
  commentLabel = '큐레이터 코멘트 · 선택',
  commentHelper = '',
  readOnly = false,
  initial = [],
} = {}) {
  const root = el('div', { class: 'cl-root' + (readOnly ? ' cl-readonly' : '') });
  const list = el('div', { class: 'cl-list' });
  const addBtn = el('button', {
    type: 'button', class: 'cl-add ghost',
    onClick: () => addCard(),
  }, addLabel);

  root.append(list);
  if (!readOnly) root.append(addBtn);

  const cards = [];

  function addCard(initialItem = null) {
    const widget = cardFactory(initialItem);
    const wrap = el('div', { class: 'cl-card', draggable: readOnly ? 'false' : 'true' });

    const sidebarChildren = [];
    if (!readOnly) sidebarChildren.push(el('span', { class: 'cl-handle', title: '드래그로 순서 변경' }, '⋮⋮'));
    sidebarChildren.push(el('span', { class: 'cl-number' }));
    const sidebar = el('div', { class: 'cl-sidebar' }, ...sidebarChildren);

    const trash = readOnly
      ? null
      : el('button', { type: 'button', class: 'cl-trash', title: '삭제', onClick: () => removeCard(wrap) }, '🗑');

    const body = el('div', { class: 'cl-body' }, widget.element);

    let commentEl = null;
    if (commentFieldName) {
      commentEl = el('textarea', {
        class: 'cl-comment',
        name: commentFieldName,
        placeholder: commentHelper || '큐레이터 코멘트',
      });
      if (readOnly) commentEl.readOnly = true;
      // initial 의 commentField 값 채우기
      if (initialItem && initialItem[commentFieldName] != null) {
        commentEl.value = String(initialItem[commentFieldName]);
      }
      const commentWrap = el('div', { class: 'cl-comment-wrap' },
        el('div', { class: 'cl-comment-head' },
          el('strong', { text: commentLabel }),
          commentHelper ? el('small', { text: commentHelper }) : null
        ),
        commentEl
      );
      body.append(commentWrap);
    }

    if (trash) wrap.append(sidebar, body, trash);
    else wrap.append(sidebar, body);
    list.append(wrap);
    if (!readOnly) wireDnd(wrap);
    cards.push({ wrap, widget, commentEl });
    renumber();
  }

  function removeCard(wrap) {
    const idx = cards.findIndex((c) => c.wrap === wrap);
    if (idx < 0) return;
    cards.splice(idx, 1);
    wrap.remove();
    renumber();
  }

  function renumber() {
    Array.from(list.children).forEach((wrap, i) => {
      const num = wrap.querySelector('.cl-number');
      if (num) num.textContent = String(i + 1);
    });
  }

  let dragSrc = null;
  function wireDnd(wrap) {
    wrap.addEventListener('dragstart', (e) => {
      dragSrc = wrap; wrap.classList.add('cl-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (_) {}
    });
    wrap.addEventListener('dragend', () => {
      wrap.classList.remove('cl-dragging');
      list.querySelectorAll('.cl-over').forEach((n) => n.classList.remove('cl-over'));
      dragSrc = null;
      cards.sort((a, b) => Array.from(list.children).indexOf(a.wrap) - Array.from(list.children).indexOf(b.wrap));
      renumber();
    });
    wrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragSrc || dragSrc === wrap) return;
      const rect = wrap.getBoundingClientRect();
      const after = (e.clientY - rect.top) / rect.height > 0.5;
      list.querySelectorAll('.cl-over').forEach((n) => n.classList.remove('cl-over'));
      wrap.classList.add('cl-over');
      if (after) wrap.parentNode.insertBefore(dragSrc, wrap.nextSibling);
      else wrap.parentNode.insertBefore(dragSrc, wrap);
    });
  }

  // initial 데이터 주입
  initial.forEach((item) => addCard(item));

  return {
    element: root,
    getValue() {
      const ordered = Array.from(list.children).map((w) => cards.find((c) => c.wrap === w)).filter(Boolean);
      return ordered.map((c) => {
        const v = c.widget.getValue();
        if (c.commentEl) return { ...v, [commentFieldName]: c.commentEl.value || null };
        return v;
      });
    },
    isEmpty() { return cards.length === 0; },
  };
}
