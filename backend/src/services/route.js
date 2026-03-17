import axios from 'axios';
import { logger } from '../utils/logger.js';

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

const routeCache = new Map();

export async function getRoute(originLat, originLng, destLat, destLng) {
  const key = `${originLat},${originLng};${destLat},${destLng}`;
  
  if (routeCache.has(key)) {
    return routeCache.get(key);
  }
  
  try {
    const response = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}`,
      {
         params: { overview: 'full', geometries: 'geojson' },
         timeout: 5000 
      }
    );
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const routeData = response.data.routes[0];
      const result = {
        distanceKm: routeData.distance / 1000,
        durationMin: routeData.duration / 60,
        geometry: routeData.geometry
      };
      
      routeCache.set(key, result);
      return result;
    }
  } catch (error) {
    logger.error('OSRM Route error:', error?.response?.data || error.message);
  }
  return null;
}
