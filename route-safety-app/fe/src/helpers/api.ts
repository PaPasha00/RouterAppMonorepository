import { RouteAnalysisRequest, RouteAnalysisResponse, ApiError } from '../types';

/**
 * Отправляет запрос на анализ маршрута
 */
export const analyzeRoute = async (requestData: RouteAnalysisRequest): Promise<RouteAnalysisResponse> => {
  const response = await fetch("http://localhost:3001/api/analyze-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.error || 'Failed to analyze route');
  }

  const data: RouteAnalysisResponse = await response.json();
  return data;
};

export async function fetchOsrmRoute(start: [number, number], end: [number, number], profile: 'foot' | 'bike' | 'car' = 'foot'): Promise<[number, number][]> {
  const osrmProfile = profile === 'car' ? 'driving' : profile === 'bike' ? 'cycling' : 'walking';
  const base = `https://router.project-osrm.org/route/v1/${osrmProfile}`;
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`; // lon,lat;lon,lat
  const url = `${base}/${coords}?overview=full&geometries=geojson&alternatives=false&steps=false`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM error: ${res.status}`);
  }
  const data = await res.json();
  if (!data.routes || !data.routes[0] || !data.routes[0].geometry) {
    throw new Error('Маршрут не найден');
  }
  const geometry = data.routes[0].geometry; // GeoJSON LineString
  const coordsGeo: [number, number][] = geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  return coordsGeo;
}
