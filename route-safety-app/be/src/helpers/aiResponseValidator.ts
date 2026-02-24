import { AIAnalysisResponse, AIAnalysisSummary, AIAnalysisStats, AIAnalysisGeography, AIAnalysisDay, AIAnalysisDayWeather } from '../types';

/**
 * Валидирует и нормализует ответ от ИИ, приводя его к строгому типу AIAnalysisResponse
 */
export function validateAndNormalizeAIResponse(rawResponse: any): AIAnalysisResponse | undefined {
  if (!rawResponse || typeof rawResponse !== 'object') {
    console.error('❌ [AI Validator] Ответ не является объектом');
    return undefined;
  }

  try {
    // Нормализуем summary
    const summary: AIAnalysisSummary = {
      difficultyScore: normalizeNumber(rawResponse.summary?.difficultyScore, 1, 10, 5),
      difficultyReasoning: normalizeString(rawResponse.summary?.difficultyReasoning, 'Сложность не оценена'),
    };

    // Нормализуем stats
    const stats: AIAnalysisStats = {
      distanceKm: normalizeNumber(rawResponse.stats?.distanceKm, 0),
      elevationGainM: normalizeNumber(rawResponse.stats?.elevationGainM, 0),
      minElevationM: normalizeNumber(rawResponse.stats?.minElevationM, 0),
      maxElevationM: normalizeNumber(rawResponse.stats?.maxElevationM, 0),
      avgSlopePercent: normalizeNumber(rawResponse.stats?.avgSlopePercent, 0),
      maxSlopePercent: normalizeNumber(rawResponse.stats?.maxSlopePercent, 0),
      sinuosity: normalizeNumber(rawResponse.stats?.sinuosity, 1),
    };

    // Нормализуем geography
    const geography: AIAnalysisGeography = {
      terrainType: normalizeString(rawResponse.geography?.terrainType, 'Неизвестно'),
      countries: normalizeStringArray(rawResponse.geography?.countries),
      regions: normalizeStringArray(rawResponse.geography?.regions),
      areas: normalizeStringArray(rawResponse.geography?.areas),
      localities: normalizeStringArray(rawResponse.geography?.localities),
      physicalGeography: normalizeString(rawResponse.geography?.physicalGeography, 'Физико-географическая характеристика не предоставлена'),
      notes: normalizeString(rawResponse.geography?.notes) || undefined,
    };

    // Нормализуем days
    const days: AIAnalysisDay[] = [];
    if (Array.isArray(rawResponse.days)) {
      rawResponse.days.forEach((day: any, index: number) => {
        if (day && typeof day === 'object') {
          const normalizedDay: AIAnalysisDay = {
            day: normalizeNumber(day.day, index + 1, 1),
            date: normalizeString(day.date, ''),
            distanceKm: normalizeNumber(day.distanceKm ?? day.distance, 0),
            elevationGainM: normalizeNumber(day.elevationGainM ?? day.elevationGain, 0),
            keyPoints: normalizeStringArray(day.keyPoints),
            weather: normalizeWeather(day.weather),
            description: normalizeString(day.description, ''),
            recommendations: normalizeStringArray(day.recommendations),
          };
          days.push(normalizedDay);
        }
      });
    }

    // Нормализуем recommendations и warnings
    const recommendations = normalizeStringArray(rawResponse.recommendations);
    const warnings = normalizeStringArray(rawResponse.warnings);

    const normalized: AIAnalysisResponse = {
      summary,
      stats,
      geography,
      days,
      recommendations,
      warnings,
    };

    console.log('✅ [AI Validator] Ответ успешно нормализован:', {
      hasSummary: !!summary,
      hasStats: !!stats,
      hasGeography: !!geography,
      daysCount: days.length,
      recommendationsCount: recommendations.length,
      warningsCount: warnings.length,
    });

    return normalized;
  } catch (error: any) {
    console.error('❌ [AI Validator] Ошибка при нормализации ответа:', error.message);
    return undefined;
  }
}

/**
 * Нормализует число, проверяя диапазон и тип
 */
function normalizeNumber(value: any, defaultValue: number, min?: number, max?: number): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    let num = value;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    return num;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    if (!isNaN(parsed) && isFinite(parsed)) {
      let num = parsed;
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      return num;
    }
  }
  return defaultValue;
}

/**
 * Нормализует строку
 */
function normalizeString(value: any, defaultValue: string = ''): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return defaultValue;
}

/**
 * Нормализует массив строк
 */
function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : String(item).trim())
      .filter(item => item.length > 0);
  }
  return [];
}

/**
 * Нормализует объект погоды
 */
function normalizeWeather(value: any): AIAnalysisDayWeather {
  if (value && typeof value === 'object') {
    // Поддерживаем разные форматы температуры
    const tempMin = normalizeNumber(
      value.temperatureMin ?? value.temperature?.min ?? value.tempMin,
      0
    );
    const tempMax = normalizeNumber(
      value.temperatureMax ?? value.temperature?.max ?? value.tempMax,
      0
    );

    return {
      temperatureMin: tempMin,
      temperatureMax: tempMax,
      conditions: normalizeString(
        value.conditions ?? value.summary ?? value.condition ?? value.weatherConditions,
        'Неизвестно'
      ),
      windSpeed: normalizeNumber(value.windSpeed ?? value.wind?.speed ?? value.windSpeedMeters, 0),
      precipitation: normalizeNumber(
        value.precipitation ?? value.precipitationMm ?? value.precip ?? value.rain,
        0
      ),
    };
  }
  return {
    temperatureMin: 0,
    temperatureMax: 0,
    conditions: 'Неизвестно',
    windSpeed: 0,
    precipitation: 0,
  };
}

