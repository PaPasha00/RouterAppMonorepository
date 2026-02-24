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
  analysis: string; // Сырой текст ответа от ИИ (fallback)
  analysisStructured?: AIAnalysisResponse; // Типизированный и валидированный ответ от ИИ
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

// Строгая типизация ответа от ИИ для анализа маршрута
export interface AIAnalysisSummary {
  difficultyScore: number; // 1-10, обязательное поле
  difficultyReasoning: string; // Обязательное поле
}

export interface AIAnalysisStats {
  distanceKm: number;
  elevationGainM: number;
  minElevationM: number;
  maxElevationM: number;
  avgSlopePercent: number;
  maxSlopePercent: number;
  sinuosity: number;
}

export interface AIAnalysisGeography {
  terrainType: string;
  countries: string[];
  regions: string[];
  areas: string[];
  localities: string[];
  physicalGeography: string; // 3-4 предложения
  notes?: string;
}

export interface AIAnalysisDayWeather {
  temperatureMin: number;
  temperatureMax: number;
  conditions: string;
  windSpeed: number;
  precipitation: number;
}

export interface AIAnalysisDay {
  day: number; // Номер дня, начиная с 1
  date: string; // Дата в формате YYYY-MM-DD
  distanceKm: number;
  elevationGainM: number;
  keyPoints: string[]; // Ключевые точки маршрута
  weather: AIAnalysisDayWeather;
  description: string;
  recommendations: string[];
}

export interface AIAnalysisResponse {
  summary: AIAnalysisSummary;
  stats: AIAnalysisStats;
  geography: AIAnalysisGeography;
  days: AIAnalysisDay[]; // Массив дней, должен соответствовать количеству дней маршрута
  recommendations: string[]; // Общие рекомендации
  warnings: string[]; // Предупреждения и важная информация
}
