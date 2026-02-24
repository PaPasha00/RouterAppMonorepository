# Примеры запросов для Postman

## Базовый URL

```
http://localhost:3001
```

или для продакшена:

```
https://your-backend-url.com
```

---

## 1. Health Check (проверка работы сервера)

**Метод:** `GET`  
**URL:** `http://localhost:3001/health`  
**Headers:** Не требуются

**Ответ:**

```json
{
  "status": "OK",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## 2. Регистрация пользователя

**Метод:** `POST`  
**URL:** `http://localhost:3001/api/auth/register`  
**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "password123"
}
```

**Ответ (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser"
  }
}
```

---

## 3. Вход (Login)

**Метод:** `POST`  
**URL:** `http://localhost:3001/api/auth/login`  
**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Ответ (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser"
  }
}
```

---

## 4. Анализ маршрута (публичный, не требует авторизации)

**Метод:** `POST`  
**URL:** `http://localhost:3001/api/analyze-route`  
**Headers:**

```
Content-Type: application/json
```

**Body (JSON) - Пеший маршрут:**

```json
{
  "coordinates": [
    [55.7558, 37.6173],
    [55.76, 37.62],
    [55.765, 37.625],
    [55.77, 37.63]
  ],
  "tourismType": "пеший",
  "startDate": "2025-07-01",
  "endDate": "2025-07-03",
  "lengthKm": 5.2,
  "elevationGain": 450,
  "elevationData": [150, 200, 350, 400, 600],
  "lengthMeters": 5200,
  "pointsPerDay": 20,
  "usePointsSystem": true,
  "includeAIRecommendations": true
}
```

**Body (JSON) - Водный маршрут:**

```json
{
  "coordinates": [
    [55.7558, 37.6173],
    [55.76, 37.62],
    [55.765, 37.625],
    [55.77, 37.63],
    [55.775, 37.635]
  ],
  "tourismType": "водный",
  "startDate": "2025-07-15",
  "endDate": "2025-07-20",
  "lengthKm": 45.5,
  "elevationGain": 120,
  "elevationData": [200, 220, 250, 280, 300, 320],
  "lengthMeters": 45500,
  "includeAIRecommendations": true
}
```

**Body (JSON) - Автомобильный маршрут:**

```json
{
  "coordinates": [
    [55.7558, 37.6173],
    [55.8, 37.7],
    [55.85, 37.8],
    [55.9, 37.9]
  ],
  "tourismType": "автомобильный",
  "startDate": "2025-08-01",
  "endDate": "2025-08-05",
  "lengthKm": 350.5,
  "elevationGain": 800,
  "elevationData": [150, 200, 300, 400, 500, 600, 700, 800, 950],
  "lengthMeters": 350500,
  "includeAIRecommendations": true
}
```

**Ответ (200):**

```json
{
  "analysis": "Текст анализа от ИИ...",
  "analysisStructured": {
    "summary": {
      "difficultyScore": 5,
      "difficultyReasoning": "Маршрут средней сложности..."
    },
    "stats": {
      "distanceKm": 5.2,
      "elevationGainM": 450,
      "minElevationM": 150,
      "maxElevationM": 600,
      "avgSlopePercent": 4.2,
      "maxSlopePercent": 12.5,
      "sinuosity": 1.3
    },
    "geography": {
      "terrainType": "Горный",
      "countries": ["Россия"],
      "regions": ["Московская область"],
      "areas": [],
      "localities": ["Москва"],
      "physicalGeography": "Описание местности..."
    },
    "days": [
      {
        "day": 1,
        "date": "2025-07-01",
        "distanceKm": 2.5,
        "elevationGainM": 200,
        "keyPoints": ["Старт", "Перевал"],
        "weather": {
          "temperatureMin": 15,
          "temperatureMax": 25,
          "conditions": "Ясно",
          "windSpeed": 5,
          "precipitation": 0
        },
        "description": "Первый день маршрута...",
        "recommendations": ["Начать рано утром"]
      }
    ],
    "recommendations": ["Проверить погоду", "Взять карту"],
    "warnings": ["Возможен гололед"]
  },
  "stats": {
    "avgSlope": 4.2,
    "maxSlope": 12.5,
    "steepSections": 2,
    "sinuosity": 1.3,
    "minElevation": 150,
    "maxElevation": 600,
    "elevationProfile": "Горный"
  },
  "terrainType": "Горный",
  "geographicContext": {
    "countries": ["Россия"],
    "regions": ["Московская область"],
    "areas": [],
    "localities": ["Москва"],
    "multiRegion": false,
    "multiCountry": false,
    "totalPointsAnalyzed": 4
  },
  "formattedGeoContext": "Россия, Московская область, Москва",
  "dailyRoutes": [
    {
      "day": 1,
      "date": "2025-07-01",
      "distance": 2.5,
      "elevationGain": 200,
      "description": "Первый день",
      "weather": {
        "date": "2025-07-01",
        "temperature": { "min": 15, "max": 25 },
        "conditions": "Ясно",
        "precipitation": 0,
        "windSpeed": 5,
        "description": "Ясная погода"
      },
      "recommendations": []
    }
  ],
  "totalDays": 3
}
```

---

## 5. Получить текущего пользователя (требует авторизацию)

**Метод:** `GET`  
**URL:** `http://localhost:3001/api/auth/me`  
**Headers:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Ответ (200):**

```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "username": "testuser"
}
```

---

## 6. Сохранить маршрут (требует авторизацию)

**Метод:** `POST`  
**URL:** `http://localhost:3001/api/routes`  
**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (JSON):**

```json
{
  "name": "Маршрут по Москве",
  "description": "Пеший маршрут по центру Москвы",
  "coordinates": [
    [55.7558, 37.6173],
    [55.76, 37.62],
    [55.765, 37.625]
  ],
  "waypointNames": ["Красная площадь", "Кремль", "Парк"],
  "roadRouting": false,
  "riverRouting": false,
  "lengthKm": 3.5
}
```

**Ответ (201):**

```json
{
  "id": "route-uuid",
  "userId": "user-uuid",
  "name": "Маршрут по Москве",
  "description": "Пеший маршрут по центру Москвы",
  "coordinates": "[[55.7558,37.6173],[55.76,37.62],[55.765,37.625]]",
  "waypointNames": "[\"Красная площадь\",\"Кремль\",\"Парк\"]",
  "roadRouting": 0,
  "riverRouting": 0,
  "lengthKm": 3.5,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

---

## 7. Получить все маршруты пользователя (требует авторизацию)

**Метод:** `GET`  
**URL:** `http://localhost:3001/api/routes`  
**Headers:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Ответ (200):**

```json
[
  {
    "id": "route-uuid-1",
    "name": "Маршрут 1",
    "description": "Описание",
    "lengthKm": 5.2,
    "createdAt": "2025-01-20T10:30:00.000Z"
  },
  {
    "id": "route-uuid-2",
    "name": "Маршрут 2",
    "description": "Описание 2",
    "lengthKm": 10.5,
    "createdAt": "2025-01-21T10:30:00.000Z"
  }
]
```

---

## 8. Получить конкретный маршрут (требует авторизацию)

**Метод:** `GET`  
**URL:** `http://localhost:3001/api/routes/:id`  
**Пример:** `http://localhost:3001/api/routes/route-uuid-here`  
**Headers:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 9. Сохранить анализ маршрута (требует авторизацию)

**Метод:** `POST`  
**URL:** `http://localhost:3001/api/routes/:id/analysis`  
**Пример:** `http://localhost:3001/api/routes/route-uuid-here/analysis`  
**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (JSON):**

```json
{
  "analysis": "Текст анализа...",
  "analysisStructured": { ... },
  "stats": { ... },
  "terrainType": "Горный",
  "geographicContext": { ... },
  "formattedGeoContext": "Россия, Москва",
  "dailyRoutes": [ ... ],
  "totalDays": 3,
  "startDate": "2025-07-01",
  "endDate": "2025-07-03",
  "tourismType": "пеший"
}
```

---

## Примечания

1. **Токен авторизации:** После регистрации или входа сохраните токен из ответа и используйте его в заголовке `Authorization: Bearer YOUR_TOKEN_HERE` для защищенных эндпоинтов.

2. **Координаты:** Формат координат - `[широта, долгота]` (latitude, longitude).

3. **Даты:** Формат дат - `YYYY-MM-DD` (например, `2025-07-01`).

4. **Типы туризма:**

   - `пеший`
   - `водный`
   - `автомобильный`
   - `велосипедный`
   - `лыжный`
   - `горный`

5. **Настройки анализа:**

   - `pointsPerDay` - максимальное количество очков в день (по умолчанию 20)
   - `usePointsSystem` - использовать ли систему очков (по умолчанию true)
   - `includeAIRecommendations` - включать ли рекомендации ИИ (по умолчанию true)

6. **Минимальные требования для анализа маршрута:**
   - Минимум 2 точки координат
   - `tourismType` - тип туризма
   - `startDate` и `endDate` - даты начала и конца маршрута
