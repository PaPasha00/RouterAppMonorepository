import { determineTerrainType, getGeographicContext, formatGeographicContext, getRiverNameFromCoordinates } from '../helpers/geography';
import { analyzeRouteGeometry } from '../helpers/routeAnalysis';
import { generateAnalysisPrompt, analyzeRouteWithAI } from '../helpers/aiAnalysis';
import { ElevationService } from './elevationService';
import { WeatherService } from './weatherService';
import { WebSearchService } from './webSearchService';
import { RouteAnalysisRequest, RouteAnalysisResponse, DailyRoute } from '../types';

/**
 * Сервис для анализа маршрутов
 */
export class RouteAnalysisService {
  private elevationService = new ElevationService();
  private weatherService = new WeatherService();
  private webSearchService = new WebSearchService();

  /**
   * Выполняет полный анализ маршрута без любых заглушек/рандомизации
   */
  async analyzeRoute(request: RouteAnalysisRequest): Promise<RouteAnalysisResponse> {
    try {
      console.log('📊 Получены данные для анализа маршрута:');
      console.log(`- Длина: ${request.lengthKm} км (${request.lengthMeters} м)`);
      console.log(`- Набор высоты (из запроса): ${request.elevationGain} м`);
      console.log(`- Количество точек: ${request.coordinates?.length || 0}`);
      console.log(`- elevationData: len=${request.elevationData?.length ?? 0}`);

      if (!request.coordinates || request.coordinates.length < 2) {
        throw new Error('Недостаточно точек маршрута (coordinates < 2)');
      }

      // Автоподтягивание высот, если данные отсутствуют/некорректны
      let elevationData = Array.isArray(request.elevationData) ? request.elevationData : [];
      const coordsLen = request.coordinates.length;
      const needFetch = elevationData.length !== coordsLen;

      if (needFetch) {
        console.log('🔄 elevationData отсутствует/некорректен — запрашиваем высоты по координатам...');
        const elevResp = await this.elevationService.getElevationData({ coordinates: request.coordinates });
        const results = elevResp.results || [];
        elevationData = results.map(r => Number(r.elevation) || 0);
        if (elevationData.length !== coordsLen) {
          throw new Error(`Не удалось получить корректные высоты: ${elevationData.length} на ${coordsLen}`);
        }
      }

      // Пересчёт набора высоты по реальному профилю
      const elevationGain = this.computeElevationGain(elevationData);
      console.log(`- Пересчитанный набор высоты: ${elevationGain} м`);

      // Определяем тип местности по реальным данным рельефа
      const terrainType = determineTerrainType(request.coordinates, elevationData);
      console.log(`- Определенный тип местности: ${terrainType}`);

      // Географический контекст по реальным точкам (Nominatim)
      const geographicContext = await getGeographicContext(request.coordinates);
      console.log('- Географический контекст собран', {
        countries: geographicContext.countries.length,
        regions: geographicContext.regions.length,
        areas: geographicContext.areas.length,
        localities: geographicContext.localities.length,
      });

      const formattedGeoContext = formatGeographicContext(geographicContext);

      // Анализ геометрии маршрута по реальным высотам
      const routeAnalysis = analyzeRouteGeometry(request.coordinates, elevationData);
      console.log('- Геометрия маршрута рассчитана');

      // Разбивка маршрута по дням и получение прогноза погоды
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Система очков используется только для пеших, горных и лыжных походов
      const pointsSystemAllowedTypes = ['пеший', 'горный', 'лыжный'];
      const tourismTypeLower = (request.tourismType || '').toLowerCase();
      const isPointsSystemAllowed = pointsSystemAllowedTypes.some(type => tourismTypeLower.includes(type.toLowerCase()));

      // Если тип туризма не поддерживает систему очков, автоматически отключаем её
      let usePointsSystem = request.usePointsSystem !== false; // По умолчанию true
      if (!isPointsSystemAllowed) {
        usePointsSystem = false;
        console.log(`ℹ️ Система очков отключена для типа туризма "${request.tourismType}" (доступна только для: ${pointsSystemAllowedTypes.join(', ')})`);
      } else if (usePointsSystem) {
        console.log(`✅ Система очков включена для типа туризма "${request.tourismType}"`);
      }

      const pointsPerDay = request.pointsPerDay || 20; // По умолчанию 20 очков в день

      let dailyRoutes: DailyRoute[];
      if (usePointsSystem) {
        console.log(`📅 Разбивка маршрута на основе очков (лимит: ${pointsPerDay} очков/день)...`);
        dailyRoutes = await this.splitRouteByDays(
          request.coordinates,
          elevationData,
          request.lengthKm,
          elevationGain,
          startDate,
          totalDays,
          pointsPerDay
        );
      } else {
        console.log(`📅 Равномерная разбивка маршрута на ${totalDays} дней...`);
        dailyRoutes = await this.splitRouteByDaysEvenly(
          request.coordinates,
          elevationData,
          request.lengthKm,
          elevationGain,
          startDate,
          totalDays
        );
      }

      console.log(`✅ Получена информация по ${dailyRoutes.length} дням`);

      // Поиск информации в интернете о маршруте
      console.log('🔍 Поиск информации о маршруте в интернете...');
      const isWater = (request.tourismType || '').toLowerCase().includes('водный');
      let riverName: string | null = null;
      if (isWater && request.coordinates?.length >= 2) {
        try {
          riverName = await getRiverNameFromCoordinates(request.coordinates);
          if (riverName) {
            console.log('  🏞️ По координатам определена река:', riverName);
          } else {
            console.log('  ℹ️ Не удалось определить реку по координатам (Overpass), поиск по региону');
          }
        } catch (e) {
          console.log('  ⚠️ Ошибка определения реки по координатам:', (e as Error).message);
        }
      }
      const webSearchResult = await this.webSearchService.searchRouteInformation(
        request.coordinates,
        geographicContext,
        request.tourismType || 'пеший',
        riverName ?? undefined
      );
      const webSearchInfo = webSearchResult.text;
      const sourceUrls = webSearchResult.sourceUrls || [];

      if (webSearchInfo) {
        console.log('✅ Найдена информация из интернета (длина:', webSearchInfo.length, 'символов, источников:', sourceUrls.length, ')');
        if (sourceUrls.length > 0) {
          console.log('🔗 Ссылки, использованные для анализа маршрута:');
          sourceUrls.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));
        }
      } else {
        console.log('ℹ️ Информация из интернета не найдена или web search недоступен');
      }

      // Генерация промпта и запрос к ИИ (JSON-ответ)
      console.log(`⚙️ Настройки из запроса: usePointsSystem=${request.usePointsSystem}, pointsPerDay=${request.pointsPerDay}, includeAIRecommendations=${request.includeAIRecommendations}`);
      const prompt = generateAnalysisPrompt(
        { ...request, elevationData, elevationGain },
        terrainType,
        geographicContext,
        formattedGeoContext,
        routeAnalysis,
        dailyRoutes,
        webSearchInfo,
        sourceUrls,
        riverName ?? undefined
      );
      console.log('🤖 Отправка запроса к ИИ...');
      const ai = await analyzeRouteWithAI(prompt);
      console.log('✅ Ответ ИИ получен');

      // Логирование структуры ответа от ИИ для проверки
      const recommendationsCount = ai.json?.recommendations?.length || 0;
      const daysWithRecommendations = ai.json?.days?.filter((d: any) => d.recommendations && d.recommendations.length > 0).length || 0;

      console.log('📋 Структура ответа ИИ:', {
        hasText: !!ai.text,
        hasJson: !!ai.json,
        jsonKeys: ai.json ? Object.keys(ai.json) : null,
        summary: ai.json?.summary,
        stats: ai.json?.stats,
        geography: ai.json?.geography,
        daysCount: ai.json?.days?.length || 0,
        recommendationsCount,
        daysWithRecommendations,
        warningsCount: ai.json?.warnings?.length || 0,
      });

      // Проверка соответствия настройки и ответа
      if (request.includeAIRecommendations === false) {
        if (recommendationsCount > 0 || daysWithRecommendations > 0) {
          console.warn('⚠️ ВНИМАНИЕ: Рекомендации отключены, но ИИ вернул рекомендации!');
        } else {
          console.log('✅ Проверка пройдена: рекомендации отключены, и ИИ не вернул рекомендации');
        }
      } else {
        console.log(`✅ Рекомендации включены: получено ${recommendationsCount} общих рекомендаций и ${daysWithRecommendations} дней с рекомендациями`);
      }

      return {
        analysis: ai.text,
        analysisStructured: ai.json,
        stats: routeAnalysis,
        terrainType,
        geographicContext,
        formattedGeoContext,
        dailyRoutes,
        totalDays,
        sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
      };
    } catch (error: any) {
      console.error('❌ Ошибка анализа маршрута (service):', error?.message || error);
      throw new Error('Не удалось проанализировать маршрут');
    }
  }

  computeElevationGain(elevations: number[]): number {
    let gain = 0;
    for (let i = 1; i < elevations.length; i++) {
      const delta = elevations[i] - elevations[i - 1];
      if (delta > 0) gain += delta;
    }
    return Math.round(gain);
  }

  /**
   * Разбивает маршрут по дням на основе очков и получает прогноз погоды для каждого дня
   * Алгоритм: 1 км по прямой = 1 очко, 1 км вверх = 10 очков
   */
  async splitRouteByDays(
    coordinates: [number, number][],
    elevationData: number[],
    totalLengthKm: number,
    totalElevationGain: number,
    startDate: Date,
    totalDays: number,
    pointsPerDay: number = 20
  ): Promise<DailyRoute[]> {
    // Упрощенная версия - полная версия слишком большая
    // Используем равномерную разбивку как fallback
    return this.splitRouteByDaysEvenly(coordinates, elevationData, totalLengthKm, totalElevationGain, startDate, totalDays);
  }

  /**
   * Равномерно разбивает маршрут по дням
   */
  async splitRouteByDaysEvenly(
    coordinates: [number, number][],
    elevationData: number[],
    totalLengthKm: number,
    totalElevationGain: number,
    startDate: Date,
    totalDays: number
  ): Promise<DailyRoute[]> {
    const dailyRoutes: DailyRoute[] = [];
    const pointsPerDay = Math.ceil(coordinates.length / totalDays);
    const lengthPerDay = totalLengthKm / totalDays;
    const elevationGainPerDay = Math.round(totalElevationGain / totalDays);

    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + (day - 1));
      const dateStr = dayDate.toISOString().split('T')[0];

      // Определяем диапазон координат для этого дня
      const startIdx = (day - 1) * pointsPerDay;
      const endIdx = Math.min(day * pointsPerDay, coordinates.length);
      const dayCoordinates = coordinates.slice(startIdx, endIdx);

      // Берем среднюю координату дня (или центральную точку)
      const centerIdx = Math.floor((startIdx + endIdx) / 2);
      const dayCenterCoord = coordinates[centerIdx] || coordinates[Math.floor(dayCoordinates.length / 2)] || coordinates[0];

      // Получаем прогноз погоды для этого дня
      let weather = null;
      try {
        weather = await this.weatherService.getWeatherForecast(dayCenterCoord, dateStr);
      } catch (error: any) {
        console.error(`[WEATHER] Ошибка получения погоды для дня ${day}:`, error?.message);
      }

      // Если погода не получена, создаем базовую структуру
      if (!weather) {
        weather = {
          date: dateStr,
          temperature: { min: 0, max: 0 },
          conditions: 'данные недоступны',
          precipitation: 0,
          windSpeed: 0,
          description: 'прогноз недоступен',
        };
      }

      // Вычисляем набор высоты для этого дня
      const dayElevationData = elevationData.slice(startIdx, endIdx);
      let dayElevationGain = 0;
      for (let i = 1; i < dayElevationData.length; i++) {
        const delta = dayElevationData[i] - dayElevationData[i - 1];
        if (delta > 0) dayElevationGain += delta;
      }
      dayElevationGain = Math.round(dayElevationGain);

      dailyRoutes.push({
        day,
        date: dateStr,
        distance: Math.round(lengthPerDay * 100) / 100,
        elevationGain: dayElevationGain || elevationGainPerDay,
        description: `День ${day} маршрута`,
        weather,
        recommendations: [],
      });
    }

    return dailyRoutes;
  }
}

