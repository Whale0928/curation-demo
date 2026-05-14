import { el, clear } from './dom.js';

const SPEC_META = {
  RECOMMENDED_WHISKY: {
    label: '추천',
    fallbackTitle: '미운날 피트위스키 추천',
    fallbackDesc: '비오는 날과 잘 어울리는 위스키',
    theme: 'mp-recommended',
  },
  WHISKY_PAIRING: {
    label: '페어링',
    fallbackTitle: '위스키와 잘 어울리는 디저트',
    fallbackDesc: '음식과 함께 보는 위스키',
    theme: 'mp-pairing',
  },
  WHISKY_TASTING_EVENT: {
    label: '시음회',
    fallbackTitle: '도시남 X 보틀노트 시음회',
    fallbackDesc: '정해진 시간과 장소에서 만나는 위스키',
    theme: 'mp-tasting',
  },
};

export function renderMobilePreview(target, draft = {}, { mode = 'input' } = {}) {
  clear(target);
  const code = draft.spec?.code || draft.specCode || draft.code;
  const meta = SPEC_META[code] || {};
  const payload = normalize(draft.payload);

  const phone = el('div', { class: 'mp-phone ' + (meta.theme || '') },
    el('div', { class: 'mp-status' },
      el('span', { text: '9:41' }),
      el('span', { text: 'network' })
    ),
    el('div', { class: 'mp-appbar' },
      el('span', { class: 'mp-back', text: '<' }),
      el('span', { class: 'mp-search', text: '도시남 위스키 둘러보기' }),
      el('span', { class: 'mp-share', text: 'share' })
    ),
    renderHero(draft, meta, mode),
    renderBody(code, payload)
  );
  target.append(phone);
}

function renderHero(draft, meta, mode) {
  const title = valueOr(draft.name, meta.fallbackTitle, '큐레이션 제목');
  const desc = valueOr(draft.description, meta.fallbackDesc, mode === 'input' ? '입력값이 모바일 화면에 반영됩니다.' : '');
  const cover = (Array.isArray(draft.imageUrls) && draft.imageUrls[0]) || draft.coverImageUrl;
  return el('section', {
    class: 'mp-hero',
    style: cover ? `background-image: linear-gradient(180deg, rgba(96,47,26,.35), rgba(35,26,22,.86)), url("${cover}")` : '',
  },
    el('span', { class: 'mp-pill', text: meta.label || '큐레이션' }),
    el('h3', { text: title }),
    desc ? el('p', { text: desc }) : null
  );
}

function renderBody(code, payload) {
  if (code === 'RECOMMENDED_WHISKY') return renderRecommended(payload);
  if (code === 'WHISKY_PAIRING') return renderPairing(payload);
  if (code === 'WHISKY_TASTING_EVENT') return renderTasting(payload);
  return el('section', { class: 'mp-body' },
    el('div', { class: 'mp-empty', text: '스펙을 선택하면 모바일 미리보기가 표시됩니다.' })
  );
}

function renderRecommended(payload) {
  const items = Array.isArray(payload) ? payload : [];
  return el('section', { class: 'mp-body' },
    el('div', { class: 'mp-section-title', text: '큐레이터 추천' }),
    items.length
      ? items.map((item) => renderWhiskyArticle(item))
      : [
        renderWhiskyArticle({
          korName: '글렌드로낙 오리지널 12년',
          engName: 'GLENDRONACH ORIGINAL 12Y',
          rating: 4.25,
          abv: '43',
          volume: '700ml',
          comment: '위스키를 선택하면 추천 코멘트와 함께 카드가 구성됩니다.',
        }),
      ]
  );
}

function renderPairing(payload) {
  const items = Array.isArray(payload) ? payload : [];
  return el('section', { class: 'mp-body' },
    el('div', { class: 'mp-section-title', text: '페어링 라인업' }),
    items.length
      ? items.map(renderPairingGroup)
      : [
        renderPairingGroup({
          korName: '글렌드로낙 오리지널 12년',
          engName: 'GLENDRONACH ORIGINAL 12Y',
          rating: 4.25,
          pairings: [{
            itemName: '부드러운 티라미수 초콜릿',
            pairingNote: '진한 단맛과 카카오 풍미에 어울리는 페어링입니다.',
          }],
        }),
      ]
  );
}

function renderTasting(payload) {
  const data = payload && !Array.isArray(payload) ? payload : {};
  const alcohols = Array.isArray(data.alcohols) ? data.alcohols : [];
  return el('section', { class: 'mp-body' },
    el('div', { class: 'mp-event-box' },
      el('span', { class: 'mp-box-label', text: '시음 일정' }),
      el('strong', { text: formatDateRange(data) || '2025.06.15 19:30' }),
      el('span', { text: data.barAddress || '장소를 입력하면 여기에 표시됩니다.' }),
      el('span', { text: data.detailAddress || '상세 주소 입력 전' }),
      el('span', { text: formatMoney(data.entryFee) + ' · 정원 ' + (data.capacity || 20) + '명' })
    ),
    renderNotes('안내', [data.guideText]),
    el('div', { class: 'mp-section-title', text: '시음 라인업' }),
    alcohols.length
      ? alcohols.map(renderWhiskyArticle)
      : [
        renderWhiskyArticle({
          korName: '글렌드로낙 오리지널 12년',
          engName: 'GLENDRONACH ORIGINAL 12Y',
          comment: '시음 위스키를 추가하면 라인업 카드가 생성됩니다.',
        }),
      ],
    el('button', { type: 'button', class: 'mp-cta', disabled: '' }, '시음회 신청하기')
  );
}

function renderPairingGroup(item) {
  const whisky = normalizeWhisky(item);
  const pairings = Array.isArray(item.pairings) ? item.pairings : [];
  return el('article', { class: 'mp-pair-group' },
    renderWhiskyArticle(whisky),
    el('div', { class: 'mp-mini-list' },
      ...(pairings.length ? pairings : [{ itemName: '페어링 음식', pairingNote: '음식을 추가하면 여기에 표시됩니다.' }])
        .map(renderPairingFood)
    )
  );
}

function renderPairingFood(item) {
  return el('article', { class: 'mp-pair-card' },
    el('div', { class: 'mp-food-img' },
      item.itemImageUrl
        ? el('img', { src: item.itemImageUrl, alt: item.itemName || '페어링 이미지' })
        : el('span', { text: 'food' })
    ),
    el('div', { class: 'mp-pair-main' },
      el('strong', { text: item.itemName || '페어링 음식' }),
      el('p', { text: item.pairingNote || '페어링 설명을 입력하면 모바일 카드에 반영됩니다.' })
    )
  );
}

function renderWhiskyArticle(item) {
  const whisky = normalizeWhisky(item);
  return el('article', { class: 'mp-whisky' },
    el('div', { class: 'mp-bottle' },
      whisky.imageUrl
        ? el('img', { src: whisky.imageUrl, alt: whisky.korName || '위스키' })
        : el('span', { text: 'bottle' })
    ),
    el('div', { class: 'mp-whisky-main' },
      el('strong', { text: whisky.korName || ('위스키 #' + (whisky.alcoholId || '-')) }),
      whisky.engName ? el('small', { text: whisky.engName }) : null,
      el('div', { class: 'mp-facts' },
        whisky.rating != null ? el('span', { text: '평점 ' + Number(whisky.rating).toFixed(2) }) : null,
        whisky.abv ? el('span', { text: whisky.abv + '%' }) : null,
        whisky.volume ? el('span', { text: whisky.volume }) : null
      ),
      renderTags(whisky.tags),
      whisky.comment ? el('p', { class: 'mp-comment', text: whisky.comment }) : null
    )
  );
}

function renderTags(tags) {
  const arr = Array.isArray(tags) ? tags.slice(0, 6) : [];
  if (!arr.length) return null;
  return el('div', { class: 'mp-tags' },
    ...arr.map((t) => el('span', { text: t.korName || t.name || String(t) }))
  );
}

function renderNotes(title, notes) {
  const list = notes.filter(Boolean).slice(0, 4);
  if (!list.length) return null;
  return el('div', { class: 'mp-notes' },
    el('strong', { text: title }),
    ...list.map((n) => el('span', { text: n }))
  );
}

function normalizeWhisky(item) {
  if (!item) return {};
  if (item.alcohol) return { ...item.alcohol, comment: item.comment };
  if (item.detail) return { ...item.detail, comment: item.comment };
  return item;
}

function normalize(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch (_) { return null; }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function valueOr(value, fallback, empty) {
  return value == null || value === '' ? (fallback || empty) : value;
}

function formatDateRange(data) {
  if (!data.eventDate && !data.eventTime) return '';
  return [data.eventDate, data.eventTime].filter(Boolean).join(' ');
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '참가비 입력 전';
  return n.toLocaleString('ko-KR') + '원';
}
