import { LatLngTuple, RouteGeometryAnalysis } from '../types';
import { calculateDistance } from './geography';

/**
 * Анализирует геометрию маршрута
 */
export function analyzeRouteGeometry(coordinates: LatLngTuple[], elevationData: number[]): RouteGeometryAnalysis {
  if (!coordinates || coordinates.length < 2) {
    return {
      avgSlope: 0,
      maxSlope: 0,
      steepSections: 0,
      sinuosity: 0,
      minElevation: 0,
      maxElevation: 0,
      elevationProfile: 'Недостаточно данных'
    };
  }

  let totalSlope = 0;
  let maxSlope = 0;
  let steepSections = 0;
  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const distance = calculateDistance(prev[0], prev[1], curr[0], curr[1]);
    totalDistance += distance;
    
    if (elevationData && elevationData.length > i) {
      const elevationDiff = elevationData[i] - elevationData[i - 1];
      const slope = (elevationDiff / distance) * 100;
      
      totalSlope += Math.abs(slope);
      maxSlope = Math.max(maxSlope, Math.abs(slope));
      
      if (Math.abs(slope) > 15) {
        steepSections++;
      }
    }
  }

  const straightLineDistance = calculateDistance(
    coordinates[0][0], coordinates[0][1],
    coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]
  );
  
  const sinuosity = totalDistance / straightLineDistance;

  let elevationProfile = 'Равнинный';
  if (elevationData) {
    const elevationRange = Math.max(...elevationData) - Math.min(...elevationData);
    if (elevationRange > 1000) elevationProfile = 'Горный';
    else if (elevationRange > 500) elevationProfile = 'Холмистый';
    else if (elevationRange > 200) elevationProfile = 'Пересеченный';
  }

  return {
    avgSlope: totalDistance > 0 ? totalSlope / (coordinates.length - 1) : 0,
    maxSlope,
    steepSections,
    sinuosity,
    minElevation: elevationData ? Math.min(...elevationData) : 0,
    maxElevation: elevationData ? Math.max(...elevationData) : 0,
    elevationProfile
  };
}
