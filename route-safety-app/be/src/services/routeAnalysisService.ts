import { RouteAnalysisRequest, RouteAnalysisResponse, LatLngTuple, DailyRoute, DailyWeather } from '../types';
import { determineTerrainType, getGeographicContext, formatGeographicContext } from '../helpers/geography';
import { analyzeRouteGeometry } from '../helpers/routeAnalysis';
import { generateAnalysisPrompt, analyzeRouteWithAI } from '../helpers/aiAnalysis';
import { ElevationService } from './elevationService';
import { WeatherService } from './weatherService';

/**
 * Сервис для анализа маршрутов
 */
export class RouteAnalysisService {
  private elevationService = new ElevationService();
  private weatherService = new WeatherService();

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
      const isPointsSystemAllowed = pointsSystemAllowedTypes.some(type => 
        tourismTypeLower.includes(type.toLowerCase())
      );
      
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

      // Генерация промпта и запрос к ИИ (JSON-ответ)
      console.log(`⚙️ Настройки из запроса: usePointsSystem=${request.usePointsSystem}, pointsPerDay=${request.pointsPerDay}, includeAIRecommendations=${request.includeAIRecommendations}`);
      const prompt = generateAnalysisPrompt(
        { ...request, elevationData, elevationGain },
        terrainType,
        geographicContext,
        formattedGeoContext,
        routeAnalysis,
        dailyRoutes
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
      };
    } catch (error: any) {
      console.error('❌ Ошибка анализа маршрута (service):', error?.message || error);
      throw new Error('Не удалось проанализировать маршрут');
    }
  }

  private computeElevationGain(elevations: number[]): number {
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
  private async splitRouteByDays(
    coordinates: LatLngTuple[],
    elevationData: number[],
    totalLengthKm: number,
    totalElevationGain: number,
    startDate: Date,
    totalDays: number,
    pointsPerDay: number = 20
  ): Promise<DailyRoute[]> {
    let dailyRoutes: DailyRoute[] = [];
    
    // Функция для расчета расстояния между двумя точками (в км)
    const haversineKm = (a: LatLngTuple, b: LatLngTuple): number => {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b[0] - a[0]);
      const dLon = toRad(b[1] - a[1]);
      const la1 = toRad(a[0]);
      const la2 = toRad(b[0]);
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    // Вычисляем очки для каждого сегмента маршрута
    // Сегмент = отрезок между двумя соседними точками маршрута
    const segments: Array<{ startIdx: number; endIdx: number; distance: number; elevationGain: number; points: number }> = [];
    
    console.log(`📐 Расчет сегментов маршрута (${coordinates.length} точек = ${coordinates.length - 1} сегментов)...`);
    
    // Показываем первые несколько сегментов для примера
    const showExamples = Math.min(5, coordinates.length - 1);
    
    for (let i = 1; i < coordinates.length; i++) {
      // Расстояние между точками (в км)
      const distance = haversineKm(coordinates[i - 1], coordinates[i]);
      
      // Высоты в начальной и конечной точках сегмента
      const startElevation = elevationData[i - 1];
      const endElevation = elevationData[i];
      
      // Разница высот между точками
      const elevationDelta = endElevation - startElevation;
      
      // Набор высоты (только если высота увеличивается, иначе 0)
      const elevationGain = elevationDelta > 0 ? elevationDelta : 0;
      
      // Расчет очков: 1 км = 1 очко, 1 км вверх = 10 очков
      const elevationGainKm = elevationGain / 1000; // переводим метры в километры
      const points = distance + (elevationGainKm * 10);
      
      // Логируем первые несколько сегментов для наглядности
      if (i <= showExamples) {
        console.log(`  Сегмент ${i - 1}→${i}: [${coordinates[i - 1][0].toFixed(4)}, ${coordinates[i - 1][1].toFixed(4)}] → [${coordinates[i][0].toFixed(4)}, ${coordinates[i][1].toFixed(4)}]`);
        console.log(`    Высоты: ${startElevation} м → ${endElevation} м (Δ=${elevationDelta > 0 ? '+' : ''}${elevationDelta.toFixed(1)} м)`);
        console.log(`    Дистанция: ${distance.toFixed(3)} км, набор высоты: ${elevationGain.toFixed(1)} м, очки: ${points.toFixed(2)}`);
      }
      
      segments.push({
        startIdx: i - 1,
        endIdx: i,
        distance,
        elevationGain,
        points,
      });
    }
    
    const segmentsTotalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const segmentsTotalElevationGain = segments.reduce((sum, s) => sum + s.elevationGain, 0);
    const segmentsTotalPoints = segments.reduce((sum, s) => sum + s.points, 0);
    
    console.log(`✅ Рассчитано ${segments.length} сегментов:`);
    console.log(`   Общая дистанция: ${segmentsTotalDistance.toFixed(2)} км`);
    console.log(`   Общий набор высоты: ${segmentsTotalElevationGain.toFixed(1)} м`);
    console.log(`   Общее количество очков: ${segmentsTotalPoints.toFixed(2)}`);

    // Вычисляем целевое количество очков на день
    // Если дней больше, чем нужно по лимиту, распределяем равномерно
    const uniformPointsPerDay = segmentsTotalPoints / totalDays;
    const targetPointsPerDay = uniformPointsPerDay <= pointsPerDay 
      ? uniformPointsPerDay  // Если равномерное распределение не превышает лимит, используем его
      : pointsPerDay;         // Иначе используем лимит
    
    console.log(`🎯 Целевое количество очков на день: ${targetPointsPerDay.toFixed(2)} (равномерно: ${uniformPointsPerDay.toFixed(2)}, лимит: ${pointsPerDay}, дней: ${totalDays})`);

    // Разбиваем маршрут по дням на основе очков
    let currentDay = 1;
    let currentDayPoints = 0;
    let currentDayDistance = 0;
    let currentDayElevationGain = 0;
    let currentDayStartIdx = 0;
    let currentDate = new Date(startDate);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Проверяем, не превысит ли добавление этого сегмента целевое количество очков
      // И не превысит ли лимит pointsPerDay
      const wouldExceedTarget = currentDayPoints + segment.points > targetPointsPerDay;
      const wouldExceedLimit = currentDayPoints + segment.points > pointsPerDay;
      const isLastDay = currentDay >= totalDays;
      
      // Если превышаем целевое количество и это не последний день, завершаем текущий день
      if ((wouldExceedTarget || wouldExceedLimit) && currentDayPoints > 0 && !isLastDay) {
        // Завершаем текущий день
        const dateStr = currentDate.toISOString().split('T')[0];
        const centerIdx = Math.floor((currentDayStartIdx + segment.startIdx) / 2);
        const dayCenterCoord: LatLngTuple = coordinates[centerIdx] || coordinates[currentDayStartIdx];

        // Получаем прогноз погоды
        let weather: DailyWeather | null = null;
        try {
          weather = await this.weatherService.getWeatherForecast(dayCenterCoord, dateStr);
        } catch (error: any) {
          console.error(`[WEATHER] Ошибка получения погоды для дня ${currentDay}:`, error?.message);
        }

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

        console.log(`📅 День ${currentDay} (${dateStr}): дистанция=${currentDayDistance.toFixed(2)} км, набор высоты=${Math.round(currentDayElevationGain)} м, очки=${currentDayPoints.toFixed(2)}`);
        
        dailyRoutes.push({
          day: currentDay,
          date: dateStr,
          distance: Math.round(currentDayDistance * 100) / 100,
          elevationGain: Math.round(currentDayElevationGain),
          description: `День ${currentDay} маршрута`,
          weather,
          recommendations: [],
        });

        // Начинаем новый день
        currentDay++;
        currentDate.setDate(startDate.getDate() + (currentDay - 1));
        currentDayPoints = 0;
        currentDayDistance = 0;
        currentDayElevationGain = 0;
        currentDayStartIdx = segment.startIdx;
      }

      // Добавляем сегмент к текущему дню
      currentDayPoints += segment.points;
      currentDayDistance += segment.distance;
      currentDayElevationGain += segment.elevationGain;
    }

    // Добавляем последний день, если есть остаток
    if (currentDayPoints > 0 || dailyRoutes.length === 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const centerIdx = Math.floor((currentDayStartIdx + coordinates.length - 1) / 2);
      const dayCenterCoord: LatLngTuple = coordinates[centerIdx] || coordinates[currentDayStartIdx];

      let weather: DailyWeather | null = null;
      try {
        weather = await this.weatherService.getWeatherForecast(dayCenterCoord, dateStr);
      } catch (error: any) {
        console.error(`[WEATHER] Ошибка получения погоды для дня ${currentDay}:`, error?.message);
      }

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

      console.log(`📅 День ${currentDay} (${dateStr}): дистанция=${currentDayDistance.toFixed(2)} км, набор высоты=${Math.round(currentDayElevationGain)} м, очки=${currentDayPoints.toFixed(2)}`);
      
      dailyRoutes.push({
        day: currentDay,
        date: dateStr,
        distance: Math.round(currentDayDistance * 100) / 100,
        elevationGain: Math.round(currentDayElevationGain),
        description: `День ${currentDay} маршрута`,
        weather,
        recommendations: [],
      });
    }

    // Если получилось дней меньше, чем запланировано, перераспределяем сегменты равномерно
    if (dailyRoutes.length < totalDays && dailyRoutes.length > 0) {
      console.log(`⚠️ Получилось ${dailyRoutes.length} дней вместо ${totalDays}. Перераспределяем равномерно...`);
      
      // Перераспределяем: распределяем сегменты пропорционально по дням
      // Если сегменты слишком большие, разбиваем их на части
      const newDailyRoutes: DailyRoute[] = [];
      
      // Вычисляем целевое количество очков на день для равномерного распределения
      const targetPointsPerDayNew = segmentsTotalPoints / totalDays;
      const targetDistancePerDay = segmentsTotalDistance / totalDays;
      const targetElevationGainPerDay = segmentsTotalElevationGain / totalDays;
      
      console.log(`🎯 Целевое распределение: ${targetPointsPerDayNew.toFixed(2)} очков/день, ${targetDistancePerDay.toFixed(2)} км/день, ${targetElevationGainPerDay.toFixed(1)} м/день`);
      
      let segmentIdx = 0;
      let currentDayPointsNew = 0;
      let currentDayDistanceNew = 0;
      let currentDayElevationGainNew = 0;
      let currentDayStartIdxNew = 0;
      
      for (let day = 1; day <= totalDays; day++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + (day - 1));
        const dateStr = dayDate.toISOString().split('T')[0];
        
        const isLastDay = day === totalDays;
        const remainingDays = totalDays - day + 1;
        const remainingSegments = segments.length - segmentIdx;
        
        // Если это последний день, добавляем все оставшиеся сегменты
        if (isLastDay) {
          while (segmentIdx < segments.length) {
            const segment = segments[segmentIdx];
            currentDayPointsNew += segment.points;
            currentDayDistanceNew += segment.distance;
            currentDayElevationGainNew += segment.elevationGain;
            segmentIdx++;
          }
        } else {
          // Распределяем сегменты пропорционально
          // Цель: приблизиться к целевому количеству очков на день
          while (segmentIdx < segments.length) {
            const segment = segments[segmentIdx];
            
            // Если добавление этого сегмента превысит цель значительно (более чем на 30%), завершаем день
            const wouldExceedSignificantly = currentDayPointsNew + segment.points > targetPointsPerDayNew * 1.3;
            
            // Если уже достигли минимум 70% от цели и добавление превысит значительно, завершаем день
            if (wouldExceedSignificantly && currentDayPointsNew >= targetPointsPerDayNew * 0.7) {
              break;
            }
            
            // Если сегмент слишком большой (больше чем 1.5 дня цели), разбиваем его пропорционально
            if (segment.points > targetPointsPerDayNew * 1.5 && currentDayPointsNew > 0) {
              // Оставляем часть сегмента на следующий день
              const remainingPoints = targetPointsPerDayNew - currentDayPointsNew;
              const ratio = Math.max(0.1, Math.min(0.9, remainingPoints / segment.points)); // Ограничиваем от 10% до 90%
              
              currentDayPointsNew += segment.points * ratio;
              currentDayDistanceNew += segment.distance * ratio;
              currentDayElevationGainNew += segment.elevationGain * ratio;
              
              // Обновляем сегмент для следующего дня (создаем новый сегмент)
              segments[segmentIdx] = {
                ...segment,
                points: segment.points * (1 - ratio),
                distance: segment.distance * (1 - ratio),
                elevationGain: segment.elevationGain * (1 - ratio),
              };
              
              break;
            }
            
            currentDayPointsNew += segment.points;
            currentDayDistanceNew += segment.distance;
            currentDayElevationGainNew += segment.elevationGain;
            segmentIdx++;
            
            // Если достигли цели (90% или больше), завершаем день
            if (currentDayPointsNew >= targetPointsPerDayNew * 0.9) {
              break;
            }
          }
        }
        
        // Определяем центральную координату для погоды
        const endIdx = segmentIdx > 0 ? segments[segmentIdx - 1].endIdx : currentDayStartIdxNew;
        const centerIdx = Math.floor((currentDayStartIdxNew + endIdx) / 2);
        const dayCenterCoord: LatLngTuple = coordinates[centerIdx] || coordinates[currentDayStartIdxNew] || coordinates[0];

        // Получаем прогноз погоды
        let weather: DailyWeather | null = null;
        try {
          weather = await this.weatherService.getWeatherForecast(dayCenterCoord, dateStr);
        } catch (error: any) {
          console.error(`[WEATHER] Ошибка получения погоды для дня ${day}:`, error?.message);
        }

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

        console.log(`📅 День ${day} (${dateStr}): дистанция=${currentDayDistanceNew.toFixed(2)} км, набор высоты=${Math.round(currentDayElevationGainNew)} м, очки=${currentDayPointsNew.toFixed(2)}`);
        
        newDailyRoutes.push({
          day,
          date: dateStr,
          distance: Math.round(currentDayDistanceNew * 100) / 100,
          elevationGain: Math.round(currentDayElevationGainNew),
          description: `День ${day} маршрута`,
          weather,
          recommendations: [],
        });
        
        // Сбрасываем для следующего дня
        if (segmentIdx > 0) {
          currentDayStartIdxNew = segments[segmentIdx - 1].endIdx;
        }
        currentDayPointsNew = 0;
        currentDayDistanceNew = 0;
        currentDayElevationGainNew = 0;
      }
      
      dailyRoutes = newDailyRoutes;
    }

    console.log(`📊 Маршрут разбит на ${dailyRoutes.length} дней на основе очков (лимит: ${pointsPerDay} очков/день)`);
    console.log(`📈 Сводка по дням:`);
    dailyRoutes.forEach((day, idx) => {
      const points = day.distance + (day.elevationGain / 1000 * 10);
      console.log(`  День ${day.day}: ${day.distance.toFixed(2)} км, +${day.elevationGain} м, ${points.toFixed(2)} очков`);
    });
    
    return dailyRoutes;
  }

  /**
   * Равномерно разбивает маршрут по дням (старый алгоритм)
   */
  private async splitRouteByDaysEvenly(
    coordinates: LatLngTuple[],
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
      const dayCenterCoord: LatLngTuple = coordinates[centerIdx] || coordinates[Math.floor(dayCoordinates.length / 2)] || coordinates[0];

      // Получаем прогноз погоды для этого дня
      let weather: DailyWeather | null = null;
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
