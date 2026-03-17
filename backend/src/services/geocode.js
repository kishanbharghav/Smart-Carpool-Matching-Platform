import axios from 'axios';
import { logger } from '../utils/logger.js';

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

const geocodeCache = new Map();

export async function geocode(address) {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }
  
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'SRM-Carpool-App' }
    });
    
    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name
      };
      geocodeCache.set(key, result);
      return result;
    }
  } catch (error) {
    logger.error('Geocode error:', error.message);
  }
  return null;
}
