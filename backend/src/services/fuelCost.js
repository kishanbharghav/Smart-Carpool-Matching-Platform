import { getRoute } from './route.js';

const FUEL_PRICE_PER_LITER = 100; // INR
const AVG_KM_PER_LITER = 15;
const CO2_KG_PER_LITER = 2.3;

export async function calculateFuelCost(originLat, originLng, destLat, destLng, passengersCount) {
  const route = await getRoute(originLat, originLng, destLat, destLng);
  if (!route) return null;

  const litersNeeded = route.distanceKm / AVG_KM_PER_LITER;
  const totalFuelCost = litersNeeded * FUEL_PRICE_PER_LITER;
  
  // Split cost among driver + passengers
  const splitWays = Math.max(1, passengersCount + 1);
  const costPerPerson = totalFuelCost / splitWays;
  
  // If a passenger joins, they save the equivalent of driving their own car
  const co2SavedTotalKg = (passengersCount * litersNeeded) * CO2_KG_PER_LITER;

  return {
    distanceKm: Math.round(route.distanceKm * 10) / 10,
    durationMin: Math.round(route.durationMin),
    totalFuelCost: Math.round(totalFuelCost),
    costPerPerson: Math.round(costPerPerson),
    co2SavedTotalKg: Math.round(co2SavedTotalKg * 100) / 100
  };
}
