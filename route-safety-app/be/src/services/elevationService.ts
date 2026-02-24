import { ElevationRequest, ElevationResponse } from '../types';

/**
 * Сервис для работы с данными о высотах
 */
export class ElevationService {
  /**
   * Получает данные о высотах через несколько источников
   */
  async getElevationData(request: ElevationRequest): Promise<ElevationResponse> {
    // OpenTopoData ожидает locations в формате lat,lon
    const locations = request.coordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');
    console.log('[ELEV] requesting for', request.coordinates.length, 'points');

    const sources = [
      {
        name: 'OpenTopoData SRTM',
        url: `https://api.opentopodata.org/v1/srtm90m?locations=${locations}`,
        method: 'GET' as const,
        transform: (data: any) => data
      },
      {
        name: 'OpenTopoData ASTER',
        url: `https://api.opentopodata.org/v1/aster30m?locations=${locations}`,
        method: 'GET' as const,
        transform: (data: any) => data
      },
      {
        name: 'OpenElevation',
        url: `https://api.open-elevation.com/api/v1/lookup`,
        method: 'POST' as const,
        transform: (data: any) => this.transformOpenElevationData(data, request.coordinates)
      }
    ];

    for (const source of sources) {
      try {
        console.log(`[ELEV] Trying ${source.name}...`);
        const response = await fetch(source.url, {
          method: source.method,
          headers: { 'Content-Type': 'application/json' },
          body: source.name === 'OpenElevation'
            ? JSON.stringify({ locations: request.coordinates.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) })
            : undefined,
        });

        if (!response.ok) {
          console.log(`[ELEV] ${source.name} failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const transformedData = source.transform(data);

        if (this.isValidElevationData(transformedData)) {
          console.log(`[ELEV] Success from ${source.name}`);
          return transformedData;
        } else {
          console.log(`[ELEV] ${source.name} returned invalid data`);
          continue;
        }
      } catch (error) {
        console.log(`[ELEV] ${source.name} failed:`, (error as Error).message);
        continue;
      }
    }

    throw new Error('All elevation data sources failed');
  }

  private transformOpenElevationData(data: any, coordinates: number[][]): ElevationResponse {
    if (data.results && Array.isArray(data.results)) {
      return {
        results: data.results.map((result: any, index: number) => ({
          elevation: result.elevation ?? 0,
          location: { lat: coordinates[index][0], lng: coordinates[index][1] }
        })),
        status: 'OK'
      };
    }
    throw new Error('Invalid OpenElevation response format');
  }

  private isValidElevationData(data: ElevationResponse): boolean {
    if (!data.results || !Array.isArray(data.results)) return false;
    const validResults = data.results.filter(r =>
      r.elevation !== null && r.elevation !== undefined && !isNaN(r.elevation) && r.elevation >= -500 && r.elevation <= 10000
    );
    return validResults.length > 0;
  }
}
