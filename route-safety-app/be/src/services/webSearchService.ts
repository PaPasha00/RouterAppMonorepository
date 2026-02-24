import axios from 'axios';

/**
 * Сервис для поиска информации в интернете о маршрутах, реках, местности
 */
export class WebSearchService {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor() {
    // Загружаем переменные окружения на случай, если они еще не загружены
    if (typeof process.env.TAVILY_API_KEY === 'undefined') {
      try {
        require('dotenv').config();
      } catch (e) {
        // Игнорируем ошибки, если dotenv уже загружен
      }
    }
    
    this.apiKey = process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ TAVILY_API_KEY не настроен. Web search будет недоступен.');
      console.warn('   Проверьте, что ключ добавлен в be/.env файл и сервер перезапущен.');
    } else {
      console.log('✅ TAVILY_API_KEY загружен, web search доступен');
    }
  }

  /**
   * Ищет информацию о реке по координатам маршрута
   */
  async searchRiverInfo(coordinates: number[][], geographicContext: any): Promise<string> {
    if (!this.apiKey) {
      return '';
    }

    try {
      // Определяем примерные координаты центра маршрута
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

      // Формируем запросы для поиска информации о реке
      const queries = [
        `река ${geographicContext.localities?.[0] || ''} ${geographicContext.regions?.[0] || ''} координаты ${centerLat.toFixed(4)} ${centerLng.toFixed(4)}`,
        `сплав по реке ${geographicContext.regions?.[0] || ''} пороги препятствия`,
        `водный маршрут ${geographicContext.localities?.[0] || ''} ${geographicContext.regions?.[0] || ''} отчет`,
      ];

      const results: string[] = [];

      for (const query of queries) {
        try {
          console.log(`  🔎 Поиск: "${query}"`);
          const response = await axios.post(
            `${this.baseUrl}/search`,
            {
              api_key: this.apiKey,
              query,
              search_depth: 'basic',
              include_answer: true,
              include_raw_content: false,
              max_results: 3,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000, // 10 секунд таймаут
            }
          );

          if (response.data?.answer) {
            console.log(`  ✅ Найден ответ (${response.data.answer.length} символов)`);
            results.push(response.data.answer);
          }

          if (response.data?.results && Array.isArray(response.data.results)) {
            const snippets = response.data.results
              .slice(0, 2)
              .map((r: any) => r.content || r.snippet)
              .filter(Boolean);
            if (snippets.length > 0) {
              console.log(`  ✅ Найдено ${snippets.length} результатов`);
              results.push(...snippets);
            }
          }
        } catch (error: any) {
          console.warn(`  ⚠️ Ошибка поиска для запроса "${query}":`, error.message);
          // Продолжаем с другими запросами
        }
      }

      if (results.length > 0) {
        const combinedInfo = `ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА О РЕКЕ И МАРШРУТЕ:\n${results.join('\n\n')}\n`;
        console.log(`  📊 Всего собрано информации: ${combinedInfo.length} символов из ${results.length} источников`);
        return combinedInfo;
      } else {
        console.log(`  ℹ️ Информация не найдена для водного маршрута`);
        return '';
      }
    } catch (error: any) {
      console.error('❌ Ошибка web search для реки:', error.message);
      return '';
    }
  }

  /**
   * Ищет информацию о пешем/автомобильном маршруте
   */
  async searchRouteInfo(
    coordinates: number[][],
    geographicContext: any,
    tourismType: string
  ): Promise<string> {
    if (!this.apiKey) {
      return '';
    }

    try {
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

      const region = geographicContext.regions?.[0] || '';
      const locality = geographicContext.localities?.[0] || '';
      const area = geographicContext.areas?.[0] || '';

      const isCar = tourismType?.toLowerCase().includes('автомобильный');
      const isHiking = !isCar;

      const queries = isCar
        ? [
            `автомобильный маршрут ${locality} ${region} дороги состояние`,
            `дорога ${locality} ${region} проезжаемость условия`,
            `автопутешествие ${region} ${area} маршрут`,
          ]
        : [
            `пеший маршрут ${locality} ${region} тропа отчет`,
            `поход ${region} ${area} маршрут сложность`,
            `туристический маршрут ${locality} ${region} описание`,
          ];

      const results: string[] = [];

      for (const query of queries) {
        try {
          console.log(`  🔎 Поиск: "${query}"`);
          const response = await axios.post(
            `${this.baseUrl}/search`,
            {
              api_key: this.apiKey,
              query,
              search_depth: 'basic',
              include_answer: true,
              include_raw_content: false,
              max_results: 3,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (response.data?.answer) {
            console.log(`  ✅ Найден ответ (${response.data.answer.length} символов)`);
            results.push(response.data.answer);
          }

          if (response.data?.results && Array.isArray(response.data.results)) {
            const snippets = response.data.results
              .slice(0, 2)
              .map((r: any) => r.content || r.snippet)
              .filter(Boolean);
            if (snippets.length > 0) {
              console.log(`  ✅ Найдено ${snippets.length} результатов`);
              results.push(...snippets);
            }
          }
        } catch (error: any) {
          console.warn(`  ⚠️ Ошибка поиска для запроса "${query}":`, error.message);
        }
      }

      if (results.length > 0) {
        const combinedInfo = `ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА О МАРШРУТЕ:\n${results.join('\n\n')}\n`;
        console.log(`  📊 Всего собрано информации: ${combinedInfo.length} символов из ${results.length} источников`);
        return combinedInfo;
      } else {
        console.log(`  ℹ️ Информация не найдена для маршрута`);
        return '';
      }
    } catch (error: any) {
      console.error('❌ Ошибка web search для маршрута:', error.message);
      return '';
    }
  }

  /**
   * Универсальный метод поиска информации о маршруте
   */
  async searchRouteInformation(
    coordinates: number[][],
    geographicContext: any,
    tourismType: string
  ): Promise<string> {
    if (!this.apiKey) {
      console.log('ℹ️ Web search пропущен: TAVILY_API_KEY не настроен');
      return '';
    }

    const isWater = tourismType?.toLowerCase().includes('водный');

    if (isWater) {
      return await this.searchRiverInfo(coordinates, geographicContext);
    } else {
      return await this.searchRouteInfo(coordinates, geographicContext, tourismType);
    }
  }
}

