import { el, clear } from '../dom.js';

export function createPairingFoodList({ readOnly = false, initial = [], onChange } = {}) {
  const root = el('div', { class: 'pfl-root' + (readOnly ? ' pfl-readonly' : '') });
  const list = el('div', { class: 'pfl-list' });
  const addBtn = el('button', {
    type: 'button',
    class: 'pfl-add',
    onClick: () => addItem(),
  }, '+ 페어링 음식 추가');

  root.append(list);
  if (!readOnly) root.append(addBtn);

  const items = [];

  function addItem(initialItem = {}) {
    const nameInput = el('input', {
      type: 'text',
      class: 'pfl-input',
      placeholder: '부드러운 티라미수 초콜릿',
      value: initialItem.itemName || '',
    });
    const imageInput = el('input', {
      type: 'url',
      class: 'pfl-input',
      placeholder: '이미지 URL',
      value: initialItem.itemImageUrl || '',
    });
    const noteInput = el('textarea', {
      class: 'pfl-textarea',
      placeholder: '페어링 설명',
    });
    noteInput.value = initialItem.pairingNote || '';

    const imageBox = el('div', { class: 'pfl-image-box' },
      initialItem.itemImageUrl
        ? el('img', { src: initialItem.itemImageUrl, alt: initialItem.itemName || '페어링 음식' })
        : el('span', { text: '이미지를 여기에' })
    );

    const removeBtn = readOnly ? null : el('button', {
      type: 'button',
      class: 'pfl-remove',
      onClick: () => removeItem(wrap),
    }, '삭제');

    if (readOnly) {
      nameInput.readOnly = true;
      imageInput.readOnly = true;
      noteInput.readOnly = true;
    } else {
      [nameInput, imageInput, noteInput].forEach((node) => node.addEventListener('input', () => {
        if (node === imageInput) renderImage(imageBox, imageInput.value.trim(), nameInput.value.trim());
        onChange?.();
      }));
    }

    const wrap = el('div', { class: 'pfl-item' },
      imageBox,
      el('div', { class: 'pfl-fields' },
        el('label', null, '위스키와 페어링할 음식', el('span', { class: 'req', text: '*' })),
        nameInput,
        noteInput,
        el('label', { class: 'pfl-url-label' }, '이미지 URL'),
        el('div', { class: 'pfl-url' }, imageInput)
      ),
      removeBtn
    );
    list.append(wrap);
    items.push({ wrap, nameInput, imageInput, noteInput });
    onChange?.();
  }

  function removeItem(wrap) {
    const idx = items.findIndex((item) => item.wrap === wrap);
    if (idx >= 0) items.splice(idx, 1);
    wrap.remove();
    onChange?.();
  }

  function renderImage(box, src, alt) {
    clear(box);
    box.append(src ? el('img', { src, alt: alt || '페어링 음식' }) : el('span', { text: '이미지를 여기에' }));
  }

  initial.forEach((item) => addItem(item));
  if (!readOnly && !items.length) addItem();

  function readItems() {
    return items.map(({ nameInput, imageInput, noteInput }) => ({
      itemName: nameInput.value.trim(),
      itemImageUrl: imageInput.value.trim() || null,
      pairingNote: noteInput.value.trim(),
    })).filter((item) => item.itemName || item.itemImageUrl || item.pairingNote);
  }

  return {
    element: root,
    getValue: readItems,
    getPreviewValue: readItems,
    isEmpty() {
      return readItems().length === 0;
    },
  };
}
