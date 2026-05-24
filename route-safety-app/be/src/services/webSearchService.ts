import axios from 'axios';

// Домены с отчётами о маршрутах — доп. запросы в Tavily
const PREFERRED_MOUNTAIN_SOURCES: string[] = [
  'turclubmai.ru',
  'tlib.ru',
  'tourism.ru',
  'lib.ru',
  'mountain.ru',
  'risk.ru',
  'alpklubspb.ru',
  'alpfederation.ru',
  'tssr.ru',
  'mountain.net.ua',
  'fst-otm.net',
  'climb.od.ua',
  'russianclimb.com',
  'vvv.ru',
  'taganok.ru',
];

const PREFERRED_WATER_SOURCES: string[] = [
  'veslo.ru',
  'vvv.ru',
  'taganok.ru',
  'tourism.intat.ru',
  'tourism.ru',
  'tlib.ru',
  'turclubmai.ru',
];

export interface WebSearchResult {
  text: string;
  sourceUrls: string[];
}

/**
 * Сервис для поиска информации в интернете о маршрутах, реках, местности
 */
export class WebSearchService {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor() {
    // dotenv, если ключ ещё не в process.env
    if (typeof process.env.TAVILY_API_KEY === 'undefined') {
      try {
        require('dotenv').config();
      } catch (e) {
      }
    }
    
    this.apiKey = process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      console.warn(' TAVILY_API_KEY не настроен. Web search будет недоступен.');
      console.warn('   Проверьте, что ключ добавлен в be/.env файл и сервер перезапущен.');
    } else {
      console.log(' TAVILY_API_KEY загружен, web search доступен');
    }
  }

  /**
   * Ищет информацию о реке по координатам маршрута.
   * Если задано riverName (определено по координатам через OSM), поиск привязывается к этой реке.
   */
  async searchRiverInfo(
    coordinates: number[][],
    geographicContext: any,
    riverName?: string | null
  ): Promise<WebSearchResult> {
    const empty: WebSearchResult = { text: '', sourceUrls: [] };
    if (!this.apiKey) {
      return empty;
    }

    try {
      // Определяем примерные координаты центра маршрута
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

      const region = geographicContext.regions?.[0] || '';
      const locality = geographicContext.localities?.[0] || '';

      // Запросы: если известна река — ищем именно по ней; иначе по региону и координатам
      let baseQueries: string[];
      if (riverName && riverName.trim()) {
        baseQueries = [
          `река ${riverName.trim()} сплав отчет`,
          `река ${riverName.trim()} ${region} пороги препятствия`,
          `водный маршрут река ${riverName.trim()} ${region} описание`,
          `река ${riverName.trim()} координаты ${centerLat.toFixed(4)} ${centerLng.toFixed(4)}`,
        ];
        console.log(`   Поиск привязан к реке: "${riverName.trim()}"`);
      } else {
        baseQueries = [
          `река ${locality} ${region} координаты ${centerLat.toFixed(4)} ${centerLng.toFixed(4)}`,
          `сплав по реке ${region} пороги препятствия`,
          `водный маршрут ${locality} ${region} отчет`,
        ];
      }

      // Дополнительные запросы по предпочтительным сайтам (с названием реки или регионом)
      const preferredQueries = PREFERRED_WATER_SOURCES.map(domain => {
        const place = (riverName && riverName.trim()) ? `река ${riverName.trim()} ${region}` : `${locality} ${region}`;
        return `отчеты о водных маршрутах ${place} сайт:${domain}`;
      }).slice(0, 4); // чтобы не делать слишком много запросов

      const queries = [...baseQueries, ...preferredQueries];

      const results: string[] = [];
      const sourceUrls = new Set<string>();

      for (const query of queries) {
        try {
          console.log(`   Поиск: "${query}"`);
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
            console.log(`   Найден ответ (${response.data.answer.length} символов)`);
            results.push(response.data.answer);
          }

          if (response.data?.results && Array.isArray(response.data.results)) {
            const items = response.data.results.slice(0, 2);
            for (const r of items) {
              if (r.url && typeof r.url === 'string') sourceUrls.add(r.url);
              const snippet = r.content || r.snippet;
              if (snippet) results.push(snippet);
            }
            if (items.length > 0) {
              console.log(`   Найдено ${items.length} результатов`);
            }
          }
        } catch (error: any) {
          console.warn(`   Ошибка поиска для запроса "${query}":`, error.message);
          // Продолжаем с другими запросами
        }
      }

      if (results.length > 0) {
        const urlsList = Array.from(sourceUrls);
        const combinedInfo = `ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА О РЕКЕ И МАРШРУТЕ:\n${results.join('\n\n')}\n`;
        console.log(`   Всего собрано информации: ${combinedInfo.length} символов из ${results.length} источников, URL: ${urlsList.length}`);
        if (urlsList.length > 0) {
          console.log('   Ссылки, по которым получена информация о реке/маршруте:');
          urlsList.forEach((url, i) => console.log(`     ${i + 1}. ${url}`));
        }
        return { text: combinedInfo, sourceUrls: urlsList };
      } else {
        console.log(`   Информация не найдена для водного маршрута`);
        return empty;
      }
    } catch (error: any) {
      console.error(' Ошибка web search для реки:', error.message);
      return empty;
    }
  }

  /**
   * Ищет информацию о пешем/автомобильном маршруте
   */
  async searchRouteInfo(
    coordinates: number[][],
    geographicContext: any,
    tourismType: string
  ): Promise<WebSearchResult> {
    const empty: WebSearchResult = { text: '', sourceUrls: [] };
    if (!this.apiKey) {
      return empty;
    }

    try {
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

      const region = geographicContext.regions?.[0] || '';
      const locality = geographicContext.localities?.[0] || '';
      const area = geographicContext.areas?.[0] || '';

      const isCar = tourismType?.toLowerCase().includes('автомобильный');
      const isHiking = !isCar;

      // Базовые запросы по типу маршрута
      const baseQueries = isCar
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

      // Для пеших/горных маршрутов дополнительно пробиваем специализированные библиотеки
      const preferredDomains = isCar ? PREFERRED_MOUNTAIN_SOURCES : PREFERRED_MOUNTAIN_SOURCES;
      const typeLabel = isCar ? 'автомобильных' : 'горных и пеших';

      const preferredQueries = preferredDomains.map(domain => {
        return `подробные отчеты о ${typeLabel} маршрутах ${locality} ${region} сайт:${domain}`;
      }).slice(0, 5);

      const queries = [...baseQueries, ...preferredQueries];

      const results: string[] = [];
      const sourceUrls = new Set<string>();

      for (const query of queries) {
        try {
          console.log(`   Поиск: "${query}"`);
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
            console.log(`   Найден ответ (${response.data.answer.length} символов)`);
            results.push(response.data.answer);
          }

          if (response.data?.results && Array.isArray(response.data.results)) {
            const items = response.data.results.slice(0, 2);
            for (const r of items) {
              if (r.url && typeof r.url === 'string') sourceUrls.add(r.url);
              const snippet = r.content || r.snippet;
              if (snippet) results.push(snippet);
            }
            if (items.length > 0) {
              console.log(`   Найдено ${items.length} результатов`);
            }
          }
        } catch (error: any) {
          console.warn(`   Ошибка поиска для запроса "${query}":`, error.message);
        }
      }

      if (results.length > 0) {
        const urlsList = Array.from(sourceUrls);
        const combinedInfo = `ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА О МАРШРУТЕ:\n${results.join('\n\n')}\n`;
        console.log(`   Всего собрано информации: ${combinedInfo.length} символов из ${results.length} источников, URL: ${urlsList.length}`);
        if (urlsList.length > 0) {
          console.log('   Ссылки, по которым получена информация о маршруте:');
          urlsList.forEach((url, i) => console.log(`     ${i + 1}. ${url}`));
        }
        return { text: combinedInfo, sourceUrls: urlsList };
      } else {
        console.log(`   Информация не найдена для маршрута`);
        return empty;
      }
    } catch (error: any) {
      console.error(' Ошибка web search для маршрута:', error.message);
      return empty;
    }
  }

  /**
   * Универсальный метод поиска информации о маршруте.
   * Для водного маршрута можно передать riverName (определённый по координатам через OSM).
   */
  async searchRouteInformation(
    coordinates: number[][],
    geographicContext: any,
    tourismType: string,
    riverName?: string | null
  ): Promise<WebSearchResult> {
    const empty: WebSearchResult = { text: '', sourceUrls: [] };
    if (!this.apiKey) {
      console.log(' Web search пропущен: TAVILY_API_KEY не настроен');
      return empty;
    }

    const isWater = tourismType?.toLowerCase().includes('водный');

    if (isWater) {
      return await this.searchRiverInfo(coordinates, geographicContext, riverName);
    } else {
      return await this.searchRouteInfo(coordinates, geographicContext, tourismType);
    }
  }
}

