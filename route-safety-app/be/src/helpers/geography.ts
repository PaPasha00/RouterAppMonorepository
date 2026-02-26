import { LatLngTuple, GeographicLocation, GeographicContext } from '../types';
import axios from 'axios';

/**
 * Рассчитывает расстояние между двумя координатами в метрах
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // радиус Земли в метрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Определяет тип местности на основе координат и высот
 */
export function determineTerrainType(coordinates: LatLngTuple[], elevationData: number[]): string {
  if (!coordinates || !elevationData || coordinates.length < 2) {
    return 'неизвестно';
  }

  const minElevation = Math.min(...elevationData);
  const maxElevation = Math.max(...elevationData);
  const elevationRange = maxElevation - minElevation;
  const avgElevation = elevationData.reduce((sum, elev) => sum + elev, 0) / elevationData.length;

  let totalSlope = 0;
  let maxSlope = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const distance = calculateDistance(prev[0], prev[1], curr[0], curr[1]);
    
    if (distance > 0 && i < elevationData.length) {
      const elevationDiff = elevationData[i] - elevationData[i - 1];
      const slope = (elevationDiff / distance) * 100;
      totalSlope += Math.abs(slope);
      maxSlope = Math.max(maxSlope, Math.abs(slope));
    }
  }

  const avgSlope = totalSlope / (coordinates.length - 1);

  if (elevationRange > 1000) {
    return 'горная местность';
  } else if (elevationRange > 500) {
    return 'холмистая местность';
  } else if (elevationRange > 200) {
    return 'пересеченная местность';
  } else if (avgSlope > 8) {
    return 'волнистая равнина';
  } else if (avgElevation < 50) {
    return 'низменность';
  } else if (avgElevation > 500) {
    return 'возвышенность';
  } else {
    return 'равнинная местность';
  }
}

/**
 * Получает географический контекст по всем точкам маршрута
 */
export async function getGeographicContext(coordinates: LatLngTuple[]): Promise<GeographicContext> {
  try {
    // Выбираем несколько ключевых точек вдоль маршрута
    const samplePoints: LatLngTuple[] = [];
    const step = Math.max(1, Math.floor(coordinates.length / 5)); // Берем 5 точек равномерно
    
    for (let i = 0; i < coordinates.length; i += step) {
      if (samplePoints.length < 5) { // Максимум 5 точек для анализа
        samplePoints.push(coordinates[i]);
      }
    }

    // Добавляем начальную и конечную точки
    if (coordinates.length > 0) {
      samplePoints.push(coordinates[0]);
      samplePoints.push(coordinates[coordinates.length - 1]);
    }

    const uniquePoints = Array.from(new Set(samplePoints.map(p => p.join(','))))
      .map(str => str.split(',').map(Number)) as LatLngTuple[];

    console.log(`🌍 Анализируем ${uniquePoints.length} точек маршрута для определения регионов`);

    // Анализируем каждую точку
    const locationPromises = uniquePoints.map(async (point, index) => {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 200)); // Задержка между запросами
        
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point[0]}&lon=${point[1]}&zoom=8&accept-language=ru`,
          {
            headers: {
              'User-Agent': 'RouteSafetyPlanner/1.0'
            }
          }
        );

        const data = response.data;
        if (data && data.address) {
          return {
            point: point,
            country: data.address.country || 'неизвестно',
            region: data.address.state || data.address.region || data.address.province || 'неизвестно',
            area: data.address.county || data.address.district || 'неизвестно',
            locality: data.address.city || data.address.town || data.address.village || 'неизвестно',
            type: data.addresstype || 'неизвестно'
          } as GeographicLocation;
        }
      } catch (error) {
        console.log(`Ошибка геокодирования точки ${index}:`, (error as Error).message);
      }
      return null;
    });

    const locations = (await Promise.all(locationPromises)).filter((loc): loc is GeographicLocation => loc !== null);

    // Анализируем результаты по всем точкам
    const countries = new Set<string>();
    const regions = new Set<string>();
    const areas = new Set<string>();
    const localities = new Set<string>();

    locations.forEach(loc => {
      if (loc.country !== 'неизвестно') countries.add(loc.country);
      if (loc.region !== 'неизвестно') regions.add(loc.region);
      if (loc.area !== 'неизвестно') areas.add(loc.area);
      if (loc.locality !== 'неизвестно') localities.add(loc.locality);
    });

    // Определяем, проходит ли маршрут через несколько регионов
    const multiRegion = regions.size > 1;
    const multiCountry = countries.size > 1;

    return {
      countries: Array.from(countries),
      regions: Array.from(regions),
      areas: Array.from(areas),
      localities: Array.from(localities),
      multiRegion: multiRegion,
      multiCountry: multiCountry,
      totalPointsAnalyzed: locations.length
    };

  } catch (error) {
    console.log('Не удалось получить географический контекст:', (error as Error).message);
    return {
      countries: ['неизвестно'],
      regions: ['неизвестно'],
      areas: ['неизвестно'],
      localities: ['неизвестно'],
      multiRegion: false,
      multiCountry: false,
      totalPointsAnalyzed: 0
    };
  }
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Определяет название реки по координатам маршрута через Overpass API (OpenStreetMap).
 * Запрашивает реки в радиусе 500 м от центра и от начальной/конечной точек маршрута.
 */
export async function getRiverNameFromCoordinates(coordinates: LatLngTuple[]): Promise<string | null> {
  if (!coordinates || coordinates.length < 2) return null;

  const pointsToCheck: LatLngTuple[] = [];
  const centerLat = coordinates.reduce((s, c) => s + c[0], 0) / coordinates.length;
  const centerLng = coordinates.reduce((s, c) => s + c[1], 0) / coordinates.length;
  pointsToCheck.push([centerLat, centerLng]);
  pointsToCheck.push(coordinates[0]);
  pointsToCheck.push(coordinates[coordinates.length - 1]);

  const seenNames = new Set<string>();

  for (const [lat, lon] of pointsToCheck) {
    try {
      // Небольшая bbox вокруг точки (~1 км), чтобы найти реку по координатам
      const delta = 0.009; // ~1 км
      const south = lat - delta;
      const north = lat + delta;
      const west = lon - delta;
      const east = lon + delta;
      const query = `[out:json][timeout:10];
( way["waterway"="river"](${south},${west},${north},${east});
  way["waterway"="stream"](${south},${west},${north},${east});
); out body;`;
      const response = await axios.post(
        OVERPASS_URL,
        query,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 8000,
        }
      );
      const data = response.data;
      if (!data?.elements?.length) continue;
      // Сортируем: сначала river, потом stream; с именем в приоритете
      const elements = (data.elements as Array<{ tags?: { waterway?: string; name?: string }; id: number }>)
        .filter((el) => el.tags?.name)
        .sort((a, b) => {
          const aRiver = a.tags?.waterway === 'river' ? 1 : 0;
          const bRiver = b.tags?.waterway === 'river' ? 1 : 0;
          if (bRiver !== aRiver) return bRiver - aRiver;
          return 0;
        });
      for (const el of elements) {
        const name = (el.tags?.name || '').trim();
        if (name) seenNames.add(name);
      }
    } catch (err) {
      console.log('  ⚠️ Overpass (река по координатам):', (err as Error).message);
    }
  }

  // Один и тот же гидроним по разным точкам — считаем основной рекой
  const names = Array.from(seenNames);
  if (names.length === 1) return names[0];
  if (names.length > 1) {
    // Несколько рек (например, при слиянии) — возвращаем первую (часто основная)
    return names[0];
  }
  return null;
}

/**
 * Форматирует географический контекст в текстовый вид
 */
export function formatGeographicContext(context: GeographicContext): string {
  if (context.countries[0] === 'неизвестно') {
    return 'географическое положение не определено';
  }

  let description = '';

  if (context.multiCountry) {
    description = `Маршрут проходит через несколько стран: ${context.countries.join(', ')}. `;
  } else {
    description = `Страна: ${context.countries[0]}. `;
  }

  if (context.multiRegion) {
    description += `Проходит через регионы: ${context.regions.join(', ')}. `;
  } else if (context.regions.length > 0) {
    description += `Регион: ${context.regions[0]}. `;
  }

  if (context.areas.length > 0) {
    description += `Районы: ${context.areas.join(', ')}. `;
  }

  if (context.localities.length > 0) {
    if (context.localities.length > 3) {
      description += `Населенные пункты: ${context.localities.slice(0, 3).join(', ')} и еще ${context.localities.length - 3}. `;
    } else {
      description += `Населенные пункты: ${context.localities.join(', ')}. `;
    }
  }

  return description;
}
