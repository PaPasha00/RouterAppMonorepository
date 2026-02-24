import L from 'leaflet';
import { LatLngTuple, ElevationStats } from '../types';

/**
 * Рассчитывает длину маршрута в метрах
 */
export const calculateRouteLength = (route: LatLngTuple[]): number => {
  if (route.length < 2) return 0;

  let totalLength = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    totalLength += L.latLng(prev[0], prev[1]).distanceTo(
      L.latLng(curr[0], curr[1])
    );
  }
  return totalLength;
};

/**
 * Форматирует длину в читаемый вид
 */
export const formatLength = (meters: number): string => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} м`;
  } else {
    return `${(meters / 1000).toFixed(2)} км`;
  }
};

/**
 * Рассчитывает статистику по высотам
 */
export const calculateElevationStats = (elevations: number[]): ElevationStats => {
  if (elevations.length < 2) {
    return { totalGain: 0, totalLoss: 0, minElevation: 0, maxElevation: 0, avgElevation: 0 };
  }

  let totalGain = 0;
  let totalLoss = 0;

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      totalGain += diff;
    } else {
      totalLoss += Math.abs(diff);
    }
  }

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const avgElevation = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;

  return {
    totalGain: Math.round(totalGain),
    totalLoss: Math.round(totalLoss),
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation),
    avgElevation: Math.round(avgElevation)
  };
};
