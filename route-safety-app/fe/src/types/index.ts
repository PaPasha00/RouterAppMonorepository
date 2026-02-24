export type LatLngTuple = [number, number];

export interface ElevationStats {
  totalGain: number;
  totalLoss: number;
  minElevation: number;
  maxElevation: number;
  avgElevation: number;
}

export interface RouteData {
  coordinates: LatLngTuple[];
  length: number;
  elevationData: number[] | null;
  elevationStats: ElevationStats | null;
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
  stats: {
    avgSlope: number;
    maxSlope: number;
    steepSections: number;
    sinuosity: number;
    minElevation: number;
    maxElevation: number;
    elevationProfile: string;
  };
  terrainType: string;
  geographicContext: {
    countries: string[];
    regions: string[];
    areas: string[];
    localities: string[];
    multiRegion: boolean;
    multiCountry: boolean;
    totalPointsAnalyzed: number;
  };
  formattedGeoContext: string;
  dailyRoutes: DailyRoute[];
  totalDays: number;
}

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

export interface ApiError {
  error: string;
}
