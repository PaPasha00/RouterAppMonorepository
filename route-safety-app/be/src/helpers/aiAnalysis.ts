import axios from 'axios';
import { RouteAnalysisRequest, RouteGeometryAnalysis, GeographicContext, DailyRoute } from '../types';

/**
 * Генерирует промпт для анализа маршрута ИИ в формате JSON
 */
export function generateAnalysisPrompt(
  request: RouteAnalysisRequest,
  terrainType: string,
  geographicContext: GeographicContext,
  formattedGeoContext: string,
  routeAnalysis: RouteGeometryAnalysis,
  dailyRoutes?: DailyRoute[]
): string {
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const jsonSchema = {
    summary: {
      difficultyScore: "number (1-10)",
      difficultyReasoning: "string",
    },
    stats: {
      distanceKm: "number",
      elevationGainM: "number",
      minElevationM: "number",
      maxElevationM: "number",
      avgSlopePercent: "number",
      maxSlopePercent: "number",
      sinuosity: "number",
    },
    geography: {
      terrainType: "string",
      countries: "string[]",
      regions: "string[]",
      areas: "string[]",
      localities: "string[]",
      physicalGeography: "string (3-4 предложения с физико-географической характеристикой местности: рельеф, климат, растительность, водные объекты)",
      notes: "string",
    },
    days: [
      {
        day: "number",
        date: "string",
        distanceKm: "number",
        elevationGainM: "number",
        keyPoints: "string[]",
        weather: {
          temperatureMin: "number",
          temperatureMax: "number",
          conditions: "string",
          windSpeed: "number",
          precipitation: "number",
        },
        description: "string",
        recommendations: "string[]",
      },
    ],
    recommendations: "string[]",
    warnings: "string[]",
  };

  // Формируем информацию о погоде по дням (ограничиваем до 20 дней для промпта)
  let weatherInfo = '';
  if (dailyRoutes && dailyRoutes.length > 0) {
    const maxDaysForPrompt = 20; // Ограничиваем для промпта, чтобы не перегружать
    const routesToShow = dailyRoutes.slice(0, maxDaysForPrompt);
    const remainingDays = dailyRoutes.length - maxDaysForPrompt;
    
    weatherInfo = '\n\nПРОГНОЗ ПОГОДЫ ПО ДНЯМ (реальные данные):\n';
    routesToShow.forEach((day) => {
      weatherInfo += `День ${day.day} (${day.date}): `;
      weatherInfo += `температура ${day.weather.temperature.min}°-${day.weather.temperature.max}°, `;
      weatherInfo += `${day.weather.conditions}, `;
      weatherInfo += `ветер ${day.weather.windSpeed} м/с, `;
      weatherInfo += `осадки ${day.weather.precipitation} мм. `;
      weatherInfo += `Дистанция: ${day.distance.toFixed(2)} км, набор высоты: ${day.elevationGain} м\n`;
    });
    
    if (remainingDays > 0) {
      weatherInfo += `\n... и еще ${remainingDays} дней (погода аналогична, используй данные из первых дней как образец)\n`;
    }
  }

  const includeRecommendations = request.includeAIRecommendations !== false; // По умолчанию true
  
  let recommendationsNote = '';
  if (!includeRecommendations) {
    recommendationsNote = '\n\nВАЖНО: Пользователь НЕ хочет получать рекомендации. Оставь поле recommendations пустым массивом [] в summary и в каждом дне.';
    console.log('🔕 Рекомендации ИИ отключены пользователем - промпт изменен');
    console.log('📝 Добавлена инструкция в промпт: "Оставь поле recommendations пустым массивом []"');
  } else {
    recommendationsNote = '\n\nВАЖНО: Обязательно заполни поле recommendations полезными рекомендациями для этого маршрута. Для длинных и сложных маршрутов дай детальные рекомендации по экипировке, безопасности, питанию, ночевкам и другим важным аспектам. В каждом дне также добавь рекомендации, если они уместны.';
    console.log('✅ Рекомендации ИИ включены - будут включены в ответ');
    console.log('📝 Добавлена инструкция в промпт: "Обязательно заполни поле recommendations"');
  }
  
  console.log(`⚙️ Параметр includeAIRecommendations из запроса: ${request.includeAIRecommendations} (обработано как: ${includeRecommendations})`);
  
  // Логируем часть промпта с рекомендациями для проверки
  if (recommendationsNote) {
    console.log('📋 Фрагмент промпта с инструкцией о рекомендациях:', recommendationsNote.substring(0, 100) + '...');
  }

  return `
Ты — эксперт по походам. Верни строго JSON без какого-либо текста до или после JSON. Никаких комментариев, пояснений или маркдауна. Если чего-то не хватает в данных — ставь null или пустые поля, но сохраняй форму.

Схема JSON (пример типов):
${JSON.stringify(jsonSchema, null, 2)}

ДАННЫЕ:
- Геоконтекст (строка):\n${formattedGeoContext}
- Мульти-регион: ${geographicContext.multiRegion}
- Мульти-страна: ${geographicContext.multiCountry}
- Протяженность: ${request.lengthKm} км
- Набор высоты: ${request.elevationGain} м
- Тип местности: ${terrainType}
- Точек: ${request.coordinates.length}
- Тип туризма: ${request.tourismType}
- Даты: ${request.startDate} - ${request.endDate} (${totalDays} дн.)
- Уклон ср: ${routeAnalysis.avgSlope.toFixed(1)}%, макс: ${routeAnalysis.maxSlope.toFixed(1)}%
- Извилистость: ${routeAnalysis.sinuosity.toFixed(2)}
- Высоты: мин ${routeAnalysis.minElevation}м, макс ${routeAnalysis.maxElevation}м, перепад ${routeAnalysis.maxElevation - routeAnalysis.minElevation}м${weatherInfo}${recommendationsNote}

ВАЖНО: Используй РЕАЛЬНЫЕ данные о погоде из раздела "ПРОГНОЗ ПОГОДЫ ПО ДНЯМ" для заполнения поля weather в массиве days. Не придумывай погоду, используй только предоставленные данные.

ВАЖНО: В поле geography.physicalGeography обязательно добавь физико-географическую характеристику местности в 3-4 предложениях. Опиши рельеф (равнинный, холмистый, горный), климатические особенности, растительность (леса, степи, тундра и т.д.), наличие водных объектов (реки, озера, болота). Используй информацию о высотах, уклонах и типе местности из предоставленных данных.

Верни ТОЛЬКО валидный JSON по указанной схеме.
  `;
}

/**
 * Отправляет запрос к ИИ для анализа маршрута и возвращает { text, json? }
 */
export async function analyzeRouteWithAI(prompt: string): Promise<{ text: string; json?: any }> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY не настроен. Создайте файл .env с вашим API ключом');
    }

    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    console.log('🤖 Отправка запроса к ИИ... (model:', model, ')');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: 'Отвечай строго валидным JSON. Никакого текста вне JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 6000, // Увеличено для больших ответов с данными по дням
        temperature: 0.4,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Route Safety Planner'
        }
      }
    );

    let content: string = response.data.choices[0].message.content?.trim() || '';

    // Удаляем markdown код блоки, если они есть
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed: any | undefined = undefined;
    try {
      parsed = JSON.parse(content);
      console.log('✅ JSON успешно распарсен');
    } catch (parseError: any) {
      // Если вдруг вернулся нестрогий JSON, пытаемся найти JSON в тексте
      console.log('⚠️ Прямой парсинг не удался, пытаемся найти JSON в тексте...');
      console.log('Первые 200 символов ответа:', content.substring(0, 200));
      
      // Пытаемся найти JSON объект в тексте (между { и })
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON найден и распарсен из текста');
        } catch (e) {
          console.error('❌ Не удалось распарсить найденный JSON:', e);
          parsed = undefined;
        }
      } else {
        console.error('❌ JSON объект не найден в ответе');
        parsed = undefined;
      }
    }

    console.log('✅ Ответ ИИ получен', {
      hasText: !!content,
      hasJson: !!parsed,
      contentLength: content.length,
      jsonKeys: parsed ? Object.keys(parsed) : null,
      firstChars: content.substring(0, 100),
      lastChars: content.substring(Math.max(0, content.length - 100)),
    });
    
    if (!parsed) {
      console.error('❌ JSON не распарсился! Содержимое ответа:');
      console.error(content);
    }
    return { text: content, json: parsed };
  } catch (error: any) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status) {
      console.error('❌ Ошибка при обращении к ИИ:', status, typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.error('❌ Ошибка при обращении к ИИ:', (error as Error).message);
    }
    if (error?.response) throw error;
    if (status === 401) {
      throw new Error('API ключ OpenRouter не настроен или неверный. См. API_SETUP.md для настройки');
    }
    throw new Error('Не удалось получить анализ от ИИ');
  }
}
