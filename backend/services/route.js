const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const routeCache = new Map();

function cacheKey(coords) {
  return coords.map(c => `${c.lat},${c.lng}`).join(';');
}

export async function getRoute(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const key = cacheKey(coords);
  if (routeCache.has(key)) return routeCache.get(key);
  const points = coords.map(c => `${c.lng},${c.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${points}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SRMCarpool/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  const result = {
    distance_km: (route.distance / 1000),
    duration_seconds: route.duration,
    geometry: route.geometry,
  };
  routeCache.set(key, result);
  return result;
}
