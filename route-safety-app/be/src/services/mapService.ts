import axios from 'axios';

export interface MapRequest {
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  provider?: 'google' | 'yandex' | 'osm';
}

export interface MapResponse {
  imageUrl: string;
  provider: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
}

export class MapService {
  private googleApiKey: string;
  private yandexApiKey: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.yandexApiKey = process.env.YANDEX_MAPS_API_KEY || '';
  }

  async getMapImage(request: MapRequest): Promise<MapResponse> {
    const {
      latitude,
      longitude,
      zoom = 15,
      width = 400,
      height = 300,
      provider = 'osm'
    } = request;

    try {
      let imageUrl: string;
      let usedProvider: string;

      switch (provider) {
        case 'google':
          imageUrl = await this.getGoogleMapImage(latitude, longitude, zoom, width, height);
          usedProvider = 'Google Maps';
          break;
        case 'yandex':
          imageUrl = await this.getYandexMapImage(latitude, longitude, zoom, width, height);
          usedProvider = 'Yandex Maps';
          break;
        case 'osm':
        default:
          imageUrl = await this.getOSMMapImage(latitude, longitude, zoom, width, height);
          usedProvider = 'OpenStreetMap';
          break;
      }

      return {
        imageUrl,
        provider: usedProvider,
        coordinates: { latitude, longitude },
        zoom
      };
    } catch (error) {
      console.error('Error getting map image:', error);
      throw new Error('Не удалось получить изображение карты');
    }
  }

  private async getGoogleMapImage(
    lat: number,
    lng: number,
    zoom: number,
    width: number,
    height: number
  ): Promise<string> {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API ключ не настроен');
    }

    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${this.googleApiKey}`;
    
    // Проверяем, что URL доступен
    const response = await axios.head(url);
    if (response.status !== 200) {
      throw new Error('Google Maps API недоступен');
    }

    return url;
  }

  private async getYandexMapImage(
    lat: number,
    lng: number,
    zoom: number,
    width: number,
    height: number
  ): Promise<string> {
    const url = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${zoom}&l=sat&size=${width},${height}&pt=${lng},${lat},pm2rdm`;
    
    // Проверяем, что URL доступен
    const response = await axios.head(url);
    if (response.status !== 200) {
      throw new Error('Yandex Maps API недоступен');
    }

    return url;
  }

  private async getOSMMapImage(
    lat: number,
    lng: number,
    zoom: number,
    width: number,
    height: number
  ): Promise<string> {
    // Используем OpenStreetMap через статический API
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-l+000(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
    
    // Проверяем, что URL доступен
    const response = await axios.head(url);
    if (response.status !== 200) {
      throw new Error('OpenStreetMap API недоступен');
    }

    return url;
  }

  async getMapTile(
    lat: number,
    lng: number,
    zoom: number,
    provider: 'google' | 'yandex' | 'osm' = 'osm'
  ): Promise<string> {
    const request: MapRequest = {
      latitude: lat,
      longitude: lng,
      zoom,
      width: 256,
      height: 256,
      provider
    };

    const result = await this.getMapImage(request);
    return result.imageUrl;
  }
}
