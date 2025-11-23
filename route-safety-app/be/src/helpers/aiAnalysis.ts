import axios from 'axios';
import { RouteAnalysisRequest, RouteGeometryAnalysis, GeographicContext, DailyRoute, AIAnalysisResponse } from '../types';
import { validateAndNormalizeAIResponse } from './aiResponseValidator';

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

  // Строгая JSON Schema для ответа
  const jsonSchema = {
    summary: {
      difficultyScore: "number (обязательно, от 1 до 10)",
      difficultyReasoning: "string (обязательно, объяснение оценки сложности)",
    },
    stats: {
      distanceKm: "number (обязательно)",
      elevationGainM: "number (обязательно)",
      minElevationM: "number (обязательно)",
      maxElevationM: "number (обязательно)",
      avgSlopePercent: "number (обязательно)",
      maxSlopePercent: "number (обязательно)",
      sinuosity: "number (обязательно)",
    },
    geography: {
      terrainType: "string (обязательно)",
      countries: "string[] (обязательно, массив строк)",
      regions: "string[] (обязательно, массив строк)",
      areas: "string[] (обязательно, массив строк)",
      localities: "string[] (обязательно, массив строк)",
      physicalGeography: "string (обязательно, 3-4 предложения с физико-географической характеристикой: рельеф, климат, растительность, водные объекты)",
      notes: "string (опционально)",
    },
    days: [
      {
        day: "number (обязательно, номер дня начиная с 1)",
        date: "string (обязательно, формат YYYY-MM-DD)",
        distanceKm: "number (обязательно)",
        elevationGainM: "number (обязательно)",
        keyPoints: "string[] (обязательно, массив ключевых точек маршрута)",
        weather: {
          temperatureMin: "number (обязательно)",
          temperatureMax: "number (обязательно)",
          conditions: "string (обязательно, описание погодных условий)",
          windSpeed: "number (обязательно, м/с)",
          precipitation: "number (обязательно, мм)",
        },
        description: "string (обязательно, описание дня)",
        recommendations: "string[] (обязательно, массив рекомендаций для этого дня)",
      },
    ],
    recommendations: "string[] (обязательно, массив общих рекомендаций)",
    warnings: "string[] (обязательно, массив предупреждений)",
  };

  // Пример валидного JSON ответа
  const exampleResponse = {
    summary: {
      difficultyScore: 5,
      difficultyReasoning: "Маршрут средней сложности из-за умеренных подъемов и протяженности",
    },
    stats: {
      distanceKm: 15.5,
      elevationGainM: 450,
      minElevationM: 200,
      maxElevationM: 650,
      avgSlopePercent: 4.2,
      maxSlopePercent: 12.5,
      sinuosity: 1.3,
    },
    geography: {
      terrainType: "Горный",
      countries: ["Россия"],
      regions: ["Кавказ"],
      areas: ["Краснодарский край"],
      localities: ["Сочи"],
      physicalGeography: "Маршрут проходит по горной местности с умеренным рельефом. Климат субтропический, влажный. Растительность представлена смешанными лесами. Встречаются горные реки и ручьи.",
      notes: "Дополнительная информация",
    },
    days: [
      {
        day: 1,
        date: "2025-11-21",
        distanceKm: 8.5,
        elevationGainM: 250,
        keyPoints: ["Старт", "Перевал", "Приют"],
        weather: {
          temperatureMin: -2,
          temperatureMax: 5,
          conditions: "Переменная облачность",
          windSpeed: 7,
          precipitation: 2,
        },
        description: "Первый день маршрута с умеренным набором высоты",
        recommendations: ["Начать рано утром", "Взять теплую одежду"],
      },
    ],
    recommendations: ["Проверить погоду", "Взять карту"],
    warnings: ["Возможен гололед", "Сильный ветер на перевале"],
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
  
  // Определяем тип маршрута для более точных рекомендаций
  const tourismType = request.tourismType || 'пеший';
  let tourismTypeNote = '';
  
  if (tourismType.toLowerCase().includes('водный')) {
    // Формируем информацию о координатах для определения реки
    const coordsInfo = request.coordinates.length > 0 
      ? `\nКоординаты маршрута (первые и последние точки):\n- Начало: ${request.coordinates[0][0]}, ${request.coordinates[0][1]}\n- Конец: ${request.coordinates[request.coordinates.length - 1][0]}, ${request.coordinates[request.coordinates.length - 1][1]}\n- Всего точек: ${request.coordinates.length}`
      : '';
    
    tourismTypeNote = `\n\nКРИТИЧЕСКИ ВАЖНО: Это ВОДНЫЙ маршрут (путешествие по реке).${coordsInfo}\n\nОБЯЗАТЕЛЬНО: Проанализируй координаты маршрута и определи, по какой реке проходит маршрут. Используй географический контекст и координаты для точного определения названия реки. Дай рекомендации, специфичные именно для этой реки: особенности течения, пороги и препятствия (если известны для этой реки), характерные участки, места для стоянок на берегу, особенности навигации на этом участке реки.\n\nРекомендации должны быть специфичны для водного туризма: безопасность на воде, спасательные жилеты, пороги и препятствия (конкретные для этой реки), течение, погодные условия на воде, экипировка для водного маршрута, техника гребли/управления плавсредством, места для стоянок на берегу, особенности реки на этом участке.\n\nНЕ давай рекомендации про спуски, подъемы, пешие переходы или горные тропы - это водный маршрут!`;
  } else if (tourismType.toLowerCase().includes('автомобильный')) {
    tourismTypeNote = '\n\nКРИТИЧЕСКИ ВАЖНО: Это АВТОМОБИЛЬНЫЙ маршрут. Рекомендации должны быть специфичны для автомобильного туризма: состояние дорог, заправки, парковки, техническое состояние автомобиля, правила дорожного движения, места для ночевок с парковкой. НЕ давай рекомендации про пешие переходы, спуски/подъемы для пешеходов или экипировку для походов.';
  } else {
    tourismTypeNote = '\n\nКРИТИЧЕСКИ ВАЖНО: Это ПЕШИЙ маршрут. Рекомендации должны быть специфичны для пешего туризма: экипировка для похода, обувь, рюкзак, питание в пути, места для ночевок, безопасность на тропах, спуски и подъемы, навигация.';
  }
  
  let recommendationsNote = '';
  if (!includeRecommendations) {
    recommendationsNote = '\n\nВАЖНО: Пользователь НЕ хочет получать рекомендации. Оставь поле recommendations пустым массивом [] в summary и в каждом дне.';
    console.log('🔕 Рекомендации ИИ отключены пользователем - промпт изменен');
    console.log('📝 Добавлена инструкция в промпт: "Оставь поле recommendations пустым массивом []"');
  } else {
    recommendationsNote = `\n\nВАЖНО: Обязательно заполни поле recommendations полезными рекомендациями для этого маршрута. Для длинных и сложных маршрутов дай детальные рекомендации по экипировке, безопасности, питанию, ночевкам и другим важным аспектам. В каждом дне также добавь рекомендации, если они уместны.${tourismTypeNote}`;
    console.log('✅ Рекомендации ИИ включены - будут включены в ответ');
    console.log('📝 Добавлена инструкция в промпт: "Обязательно заполни поле recommendations"');
    console.log(`🎯 Тип маршрута: ${tourismType} - рекомендации будут адаптированы под этот тип`);
  }
  
  console.log(`⚙️ Параметр includeAIRecommendations из запроса: ${request.includeAIRecommendations} (обработано как: ${includeRecommendations})`);
  
  // Логируем часть промпта с рекомендациями для проверки
  if (recommendationsNote) {
    console.log('📋 Фрагмент промпта с инструкцией о рекомендациях:', recommendationsNote.substring(0, 100) + '...');
  }

  return `Ты — эксперт по походам и туризму. Твоя задача — проанализировать маршрут и вернуть СТРОГО ВАЛИДНЫЙ JSON объект.

КРИТИЧЕСКИ ВАЖНО:
1. Верни ТОЛЬКО валидный JSON объект, без каких-либо комментариев, пояснений, markdown разметки или текста до/после JSON
2. JSON должен начинаться с символа { и заканчиваться символом }
3. Все поля обязательны, кроме geography.notes (опционально)
4. Все числа должны быть числами, а не строками
5. Все массивы должны быть массивами, даже если они пустые []

СХЕМА JSON (все поля обязательны):
${JSON.stringify(jsonSchema, null, 2)}

ПРИМЕР ВАЛИДНОГО JSON ОТВЕТА:
${JSON.stringify(exampleResponse, null, 2)}

ДАННЫЕ ДЛЯ АНАЛИЗА:
- Геоконтекст: ${formattedGeoContext}
- Мульти-регион: ${geographicContext.multiRegion}
- Мульти-страна: ${geographicContext.multiCountry}
- Протяженность: ${request.lengthKm} км
- Набор высоты: ${request.elevationGain} м
- Тип местности: ${terrainType}
- Количество точек: ${request.coordinates.length}
- Тип туризма: ${request.tourismType}
- Даты: ${request.startDate} - ${request.endDate} (${totalDays} дней)
- Средний уклон: ${routeAnalysis.avgSlope.toFixed(1)}%
- Максимальный уклон: ${routeAnalysis.maxSlope.toFixed(1)}%
- Извилистость: ${routeAnalysis.sinuosity.toFixed(2)}
- Высоты: мин ${routeAnalysis.minElevation}м, макс ${routeAnalysis.maxElevation}м, перепад ${routeAnalysis.maxElevation - routeAnalysis.minElevation}м
${request.tourismType?.toLowerCase().includes('водный') ? `- Координаты маршрута (для определения реки): начало [${request.coordinates[0]?.[0]}, ${request.coordinates[0]?.[1]}], конец [${request.coordinates[request.coordinates.length - 1]?.[0]}, ${request.coordinates[request.coordinates.length - 1]?.[1]}]` : ''}${weatherInfo}${recommendationsNote}

ИНСТРУКЦИИ ПО ЗАПОЛНЕНИЮ:
1. summary.difficultyScore: число от 1 до 10, где 1 = очень легко, 10 = экстремально сложно
2. summary.difficultyReasoning: подробное объяснение оценки (2-3 предложения)
3. stats: используй точные данные из предоставленных выше
4. geography: заполни все массивы (countries, regions, areas, localities) на основе геоконтекста
5. geography.physicalGeography: обязательно 3-4 предложения о рельефе, климате, растительности, водных объектах
6. days: создай массив дней, соответствующий количеству дней маршрута (${totalDays} дней)
7. days[].weather: используй ТОЛЬКО реальные данные из раздела "ПРОГНОЗ ПОГОДЫ ПО ДНЯМ" выше, не придумывай погоду
8. days[].date: формат строго YYYY-MM-DD, начиная с ${request.startDate}
9. recommendations: массив общих рекомендаций для всего маршрута
10. warnings: массив важных предупреждений и рисков

ПОВТОРЯЮ: Верни ТОЛЬКО валидный JSON объект, начинающийся с { и заканчивающийся }. Никакого другого текста!`;
}

/**
 * Отправляет запрос к ИИ для анализа маршрута и возвращает { text, json?: AIAnalysisResponse }
 */
export async function analyzeRouteWithAI(prompt: string): Promise<{ text: string; json?: AIAnalysisResponse }> {
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
          { 
            role: 'system', 
            content: `Ты — эксперт по анализу туристических маршрутов. Твоя задача — вернуть СТРОГО ВАЛИДНЫЙ JSON объект.

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект
- JSON должен начинаться с { и заканчиваться }
- НИКАКОГО текста, комментариев, markdown разметки до или после JSON
- Все числа должны быть числами (не строками)
- Все массивы должны быть массивами (даже пустые [])
- Все обязательные поля должны быть заполнены

Если ты не можешь вернуть валидный JSON, лучше верни пустой объект {} и объясни проблему в поле summary.difficultyReasoning.` 
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8000, // Увеличено для больших ответов с данными по дням
        temperature: 0.3, // Снижено для более детерминированных ответов
        response_format: { type: 'json_object' }, // Принудительный JSON формат (если поддерживается моделью)
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
      console.log('Первые 500 символов ответа:', content.substring(0, 500));
      
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
        console.error('Полный ответ ИИ:', content);
        parsed = undefined;
      }
    }

    // Валидация и нормализация ответа
    let validatedResponse: AIAnalysisResponse | undefined = undefined;
    if (parsed) {
      validatedResponse = validateAndNormalizeAIResponse(parsed);
      if (!validatedResponse) {
        console.error('❌ Валидация ответа ИИ не прошла. Сырой ответ:', JSON.stringify(parsed, null, 2));
      } else {
        console.log('✅ Ответ ИИ успешно валидирован и нормализован');
      }
    }

    console.log('📊 Итоговый статус ответа ИИ:', {
      hasText: !!content,
      hasRawJson: !!parsed,
      hasValidatedJson: !!validatedResponse,
      contentLength: content.length,
      rawJsonKeys: parsed ? Object.keys(parsed) : null,
      validatedJsonKeys: validatedResponse ? Object.keys(validatedResponse) : null,
    });
    
    if (!validatedResponse) {
      console.error('❌ Валидный JSON не получен! Содержимое ответа:');
      console.error(content.substring(0, 1000));
    }
    
    return { text: content, json: validatedResponse };
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
