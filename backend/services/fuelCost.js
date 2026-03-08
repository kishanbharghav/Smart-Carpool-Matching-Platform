const DEFAULT_MILEAGE = 15;
const DEFAULT_FUEL_PRICE = 100;
/** Approximate CO2 (kg) per km for a typical petrol car (for carpool savings) */
const CO2_KG_PER_KM = 0.12;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function computeFuelCost(distance_km, mileage_km_per_litre = DEFAULT_MILEAGE, fuel_price_per_litre = DEFAULT_FUEL_PRICE) {
  if (distance_km == null || distance_km <= 0) return { total: 0, per_litre_price: fuel_price_per_litre };
  const total = (distance_km / mileage_km_per_litre) * fuel_price_per_litre;
  return { total: Math.round(total * 100) / 100, per_litre_price: fuel_price_per_litre };
}

export function costPerPassenger(totalCost, passengerCount) {
  const totalPeople = 1 + (passengerCount || 0);
  return totalPeople > 0 ? Math.round((totalCost / totalPeople) * 100) / 100 : totalCost;
}

/** Estimated CO2 saved (kg) by carpooling: passengers who didn't drive their own car. */
export function co2SavedKg(distance_km, passengerCount) {
  if (distance_km == null || distance_km <= 0) return 0;
  const passengers = Math.max(0, passengerCount || 0);
  return Math.round(distance_km * CO2_KG_PER_KM * passengers * 100) / 100;
}
