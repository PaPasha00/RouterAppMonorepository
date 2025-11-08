import axios from 'axios';
import { LatLngTuple, DailyWeather } from '../types';

/**
 * Сервис для получения прогноза погоды
 */
export class WeatherService {
  /**
   * Получает прогноз погоды для координат на конкретную дату
   * Использует Open-Meteo API (бесплатный, без ключа)
   */
  async getWeatherForecast(
    coordinates: LatLngTuple,
    date: string
  ): Promise<DailyWeather | null> {
    try {
      const [lat, lng] = coordinates;
      const targetDate = new Date(date);
      const today = new Date();
      const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Open-Meteo предоставляет прогноз на 16 дней вперед
      if (daysDiff < 0 || daysDiff > 16) {
        console.log(`[WEATHER] Дата ${date} вне диапазона прогноза (0-16 дней)`);
        return null;
      }

      console.log(`[WEATHER] Запрос погоды для координат [${lat}, ${lng}] на дату ${date} (день ${daysDiff})`);

      // Open-Meteo API для прогноза погоды
      const url = `https://api.open-meteo.com/v1/forecast`;
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max',
        timezone: 'auto',
        forecast_days: '16',
      });

      const response = await axios.get(`${url}?${params.toString()}`);
      const data = response.data;

      if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
        console.log('[WEATHER] Нет данных о погоде');
        return null;
      }

      // Находим индекс нужной даты
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const dateIndex = data.daily.time.findIndex((d: string) => d === targetDateStr);

      if (dateIndex === -1) {
        console.log(`[WEATHER] Дата ${targetDateStr} не найдена в прогнозе`);
        return null;
      }

      const weatherCode = data.daily.weathercode[dateIndex];
      const conditions = this.weatherCodeToCondition(weatherCode);

      const weather: DailyWeather = {
        date: targetDateStr,
        temperature: {
          min: Math.round(data.daily.temperature_2m_min[dateIndex]),
          max: Math.round(data.daily.temperature_2m_max[dateIndex]),
        },
        conditions,
        precipitation: Math.round(data.daily.precipitation_sum[dateIndex] * 10) / 10, // мм, округляем до 0.1
        windSpeed: Math.round(data.daily.windspeed_10m_max[dateIndex] * 10) / 10, // м/с, округляем до 0.1
        description: this.getWeatherDescription(weatherCode, data.daily.temperature_2m_max[dateIndex]),
      };

      console.log(`[WEATHER] Получен прогноз: ${weather.temperature.min}°-${weather.temperature.max}°, ${conditions}`);
      return weather;
    } catch (error: any) {
      console.error('[WEATHER] Ошибка получения погоды:', error?.message || error);
      return null;
    }
  }

  /**
   * Преобразует код погоды WMO в текстовое описание
   */
  private weatherCodeToCondition(code: number): string {
    // WMO Weather interpretation codes (WW)
    const codes: { [key: number]: string } = {
      0: 'ясно',
      1: 'преимущественно ясно',
      2: 'переменная облачность',
      3: 'пасмурно',
      45: 'туман',
      48: 'туман с инеем',
      51: 'легкая морось',
      53: 'умеренная морось',
      55: 'сильная морось',
      56: 'легкая ледяная морось',
      57: 'сильная ледяная морось',
      61: 'слабый дождь',
      63: 'умеренный дождь',
      65: 'сильный дождь',
      66: 'легкий ледяной дождь',
      67: 'сильный ледяной дождь',
      71: 'легкий снег',
      73: 'умеренный снег',
      75: 'сильный снег',
      77: 'снежные зерна',
      80: 'слабые ливни',
      81: 'умеренные ливни',
      82: 'сильные ливни',
      85: 'легкие снежные ливни',
      86: 'сильные снежные ливни',
      95: 'гроза',
      96: 'гроза с градом',
      99: 'гроза с сильным градом',
    };

    return codes[code] || 'неизвестно';
  }

  /**
   * Генерирует описание погоды
   */
  private getWeatherDescription(code: number, tempMax: number): string {
    const condition = this.weatherCodeToCondition(code);
    const tempDesc = tempMax >= 25 ? 'жарко' : tempMax >= 15 ? 'тепло' : tempMax >= 5 ? 'прохладно' : 'холодно';
    return `${condition}, ${tempDesc}`;
  }
}

