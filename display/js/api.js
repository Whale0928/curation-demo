const BASE = 'http://localhost:8081';

export async function getJson(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function postJson(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export const api = {
  listSpecs:       () => getJson('/api/specs'),
  listAlcohols:    (limit = 20) => getJson(`/api/alcohols?limit=${limit}`),
  searchAlcohols:  (q, limit = 10) =>
    getJson(`/api/alcohols/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  alcoholDetail:   (id) => getJson(`/api/alcohols/${id}/detail`),
  createCuration:  (body) => postJson('/api/curations', body),
  listCurations:   () => getJson('/api/curations'),
  curationDetail:  (id) => getJson(`/api/curations/${id}`),
};
