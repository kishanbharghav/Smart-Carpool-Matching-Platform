const NOMINATIM_BASE = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

const cache = new Map();

export async function geocodeAddress(query) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SRMCarpool/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const first = data?.[0];
  if (!first?.lat || !first?.lon) return null;
  const result = { lat: parseFloat(first.lat), lng: parseFloat(first.lon), display_name: first.display_name };
  cache.set(key, result);
  return result;
}

export function hasCoords(obj) {
  return obj && typeof obj.lat === 'number' && typeof obj.lng === 'number';
}
