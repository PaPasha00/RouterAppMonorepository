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
      const targetDate = new Date(date + 'T12:00:00Z'); // полдень UTC, чтобы не съезжать на соседний день из-за времени
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Если дата в прошлом — запрашиваем погоду на сегодня (как приближение для первого дня)
      let dateToRequest = date;
      if (daysDiff < 0) {
        console.log(`[WEATHER] Дата ${date} в прошлом, используем прогноз на сегодня (${todayStr}) для приближённых данных`);
        dateToRequest = todayStr;
        daysDiff = 0;
      }

      // Open-Meteo предоставляет прогноз на 16 дней (индексы 0..15: сегодня + 15 следующих)
      if (daysDiff > 15) {
        console.log(`[WEATHER] Дата ${date} вне диапазона прогноза (доступно 0–15 дней от сегодня)`);
        return null;
      }

      console.log(`[WEATHER] Запрос погоды для координат [${lat}, ${lng}] на дату ${dateToRequest} (день ${daysDiff})`);

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

      const targetDateStr = new Date(dateToRequest + 'T12:00:00Z').toISOString().split('T')[0];
      let dateIndex = data.daily.time.findIndex((d: string) => d === targetDateStr);

      // Если точной даты нет (часовой пояс API vs UTC) — берём ближайшую: сначала первый день прогноза
      if (dateIndex === -1) {
        dateIndex = 0;
        console.log(`[WEATHER] Дата ${targetDateStr} не найдена в ответе, используем первый доступный день: ${data.daily.time[0]}`);
      }

      const weatherCode = data.daily.weathercode[dateIndex];
      const conditions = this.weatherCodeToCondition(weatherCode);

      const weather: DailyWeather = {
        date: new Date(date + 'T12:00:00Z').toISOString().split('T')[0], // в ответе сохраняем запрошенную дату (день маршрута)
        temperature: {
          min: Math.round(data.daily.temperature_2m_min[dateIndex]),
          max: Math.round(data.daily.temperature_2m_max[dateIndex]),
        },
        conditions,
        precipitation: Math.round(data.daily.precipitation_sum[dateIndex] * 10) / 10,
        windSpeed: Math.round(data.daily.windspeed_10m_max[dateIndex] * 10) / 10,
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

