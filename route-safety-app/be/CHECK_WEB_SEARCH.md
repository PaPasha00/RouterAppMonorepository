# Проверка Tavily (web search)

Ключ в `be/.env`, сервер перезапущен.

## При старте

```
TAVILY_API_KEY: настроен (tvly-...)
```

или предупреждение, что ключа нет.

## При анализе маршрута

В логах `npm run dev`:

```
Поиск информации о маршруте в интернете...
Найдена информация из интернета
```

Без ключа:

```
Web search пропущен: TAVILY_API_KEY не настроен
```

## curl к Tavily

```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "tvly-...",
    "query": "пеший маршрут Москва",
    "search_depth": "basic",
    "include_answer": true,
    "max_results": 3
  }'
```

## Если пусто

```bash
cd be && cat .env | grep TAVILY
npm run dev
```

Подробнее: `WEB_SEARCH_SETUP.md`, `WEB_SEARCH_CHECK.md`.
