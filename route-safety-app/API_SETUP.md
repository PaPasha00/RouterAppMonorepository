# OpenRouter — ключ для анализа маршрута

Если при анализе приходит `401` от OpenRouter — в `be/.env` нет ключа или он неверный.

## Что сделать

1. Ключ на https://openrouter.ai/ → Keys → скопировать (`sk-or-v1-...`).
2. Файл `be/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
PORT=3001
```

3. Перезапустить бэкенд:

```bash
cd be
npm run dev
```

Проверка: `node test-api.js` из папки `be`.

## Без OpenRouter

Временно можно заглушить `analyzeRouteWithAI` в `be/src/helpers/aiAnalysis.ts`, если нужен только UI без ИИ. Для нормальной работы ключ обязателен.

`.env` в git не коммитить.
