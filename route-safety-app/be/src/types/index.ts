export interface Coordinate {
  lat: number;
  lng: number;
}

export type LatLngTuple = [number, number];

export interface ElevationRequest {
  coordinates: LatLngTuple[];
}

export interface ElevationResult {
  elevation: number;
  location: {
    lat: number;
    lng: number;
  };
}

export interface ElevationResponse {
  results: ElevationResult[];
  status: string;
}

export interface RouteAnalysisRequest {
  lengthKm: number;
  elevationGain: number;
  coordinates: LatLngTuple[];
  elevationData: number[];
  lengthMeters: number;
  tourismType: string;
  startDate: string;
  endDate: string;
  pointsPerDay?: number; // Максимальное количество очков в день (по умолчанию 20)
  usePointsSystem?: boolean; // Использовать ли систему очков для разбивки маршрута (по умолчанию true)
  includeAIRecommendations?: boolean; // Включать ли рекомендации от ИИ в анализ (по умолчанию true)
}

export interface GeographicLocation {
  point: LatLngTuple;
  country: string;
  region: string;
  area: string;
  locality: string;
  type: string;
}

export interface GeographicContext {
  countries: string[];
  regions: string[];
  areas: string[];
  localities: string[];
  multiRegion: boolean;
  multiCountry: boolean;
  totalPointsAnalyzed: number;
}

export interface RouteGeometryAnalysis {
  avgSlope: number;
  maxSlope: number;
  steepSections: number;
  sinuosity: number;
  minElevation: number;
  maxElevation: number;
  elevationProfile: string;
}

export interface DailyWeather {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  conditions: string;
  precipitation: number;
  windSpeed: number;
  description: string;
}

export interface DailyRoute {
  day: number;
  date: string;
  distance: number;
  elevationGain: number;
  description: string;
  weather: DailyWeather;
  recommendations: string[];
}

export interface RouteAnalysisResponse {
  analysis: string;
  analysisStructured?: any;
  stats: RouteGeometryAnalysis;
  terrainType: string;
  geographicContext: GeographicContext;
  formattedGeoContext: string;
  dailyRoutes: DailyRoute[];
  totalDays: number;
}

export interface ApiError {
  error: string;
}
