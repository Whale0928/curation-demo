import { el, clear } from '../dom.js';

/**
 * CardListContainer
 * - container=array 인 큐레이션의 카드 N개 반복 영역
 * - + 추가 / 🗑️ 삭제 / ⋮⋮ 드래그
 *
 * cardFactory: () => { element, getValue(), isEmpty() }
 *   카드 렌더링은 외부에서 주입 (alcohol-card 등)
 *
 * commentFieldName: 카드 하단에 별도 textarea 로 받을 필드명 (있으면 카드 본문 + 코멘트)
 *
 * getValue() → 카드별 getValue() 결과 배열
 */
export function createCardList({
  cardFactory,
  itemLabel = '항목',
  addLabel = '+ 추가',
  commentFieldName = null,
  commentLabel = '큐레이터 코멘트 · 선택',
  commentHelper = '',
} = {}) {
  const root = el('div', { class: 'cl-root' });
  const list = el('div', { class: 'cl-list' });
  const addBtn = el('button', {
    type: 'button',
    class: 'cl-add ghost',
    onClick: () => addCard(),
  }, addLabel);
  root.append(list, addBtn);

  /** 카드 인스턴스 추적 */
  const cards = []; // { wrap, widget, commentEl }

  function addCard(initial = null) {
    const widget = cardFactory(initial);
    const wrap = el('div', { class: 'cl-card', draggable: 'true' });

    // 좌측 사이드바 (드래그 핸들 + 번호)
    const sidebar = el('div', { class: 'cl-sidebar' },
      el('span', { class: 'cl-handle', title: '드래그로 순서 변경' }, '⋮⋮'),
      el('span', { class: 'cl-number' })
    );

    // 우측 액션 (삭제)
    const trash = el('button', {
      type: 'button', class: 'cl-trash', title: '삭제',
      onClick: () => removeCard(wrap),
    }, '🗑');

    // 카드 본문
    const body = el('div', { class: 'cl-body' }, widget.element);

    // 카드 하단 코멘트 (옵션)
    let commentEl = null;
    if (commentFieldName) {
      commentEl = el('textarea', {
        class: 'cl-comment',
        name: commentFieldName,
        placeholder: commentHelper || '큐레이터 코멘트',
      });
      const commentWrap = el('div', { class: 'cl-comment-wrap' },
        el('div', { class: 'cl-comment-head' },
          el('strong', { text: commentLabel }),
          commentHelper ? el('small', { text: commentHelper }) : null
        ),
        commentEl
      );
      body.append(commentWrap);
    }

    wrap.append(sidebar, body, trash);
    list.append(wrap);

    // 드래그앤드롭
    wireDnd(wrap);

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

  // 드래그앤드롭 (HTML5 native, 카드 위 → 위치 표시 → drop 시 reorder)
  let dragSrc = null;
  function wireDnd(wrap) {
    wrap.addEventListener('dragstart', (e) => {
      dragSrc = wrap;
      wrap.classList.add('cl-dragging');
      e.dataTransfer.effectAllowed = 'move';
      // FF 호환
      try { e.dataTransfer.setData('text/plain', ''); } catch (_) {}
    });
    wrap.addEventListener('dragend', () => {
      wrap.classList.remove('cl-dragging');
      list.querySelectorAll('.cl-over').forEach((n) => n.classList.remove('cl-over'));
      dragSrc = null;
      // cards 배열도 DOM 순서로 재정렬
      cards.sort((a, b) => {
        const ai = Array.from(list.children).indexOf(a.wrap);
        const bi = Array.from(list.children).indexOf(b.wrap);
        return ai - bi;
      });
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

  return {
    element: root,
    getValue() {
      // DOM 순서대로 cards를 정렬
      const ordered = Array.from(list.children).map((w) => cards.find((c) => c.wrap === w)).filter(Boolean);
      return ordered.map((c) => {
        const v = c.widget.getValue();
        if (c.commentEl) {
          // commentFieldName 으로 카드 widget 결과에 코멘트 머지
          return { ...v, [commentFieldName]: c.commentEl.value || null };
        }
        return v;
      });
    },
    isEmpty() {
      return cards.length === 0;
    },
    nonEmptyCount() {
      return cards.filter((c) => !c.widget.isEmpty()).length;
    },
  };
}
