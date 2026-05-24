# API не отвечает

## Чеклист

1. `curl http://localhost:3001/health` — бэкенд жив?  
2. С телефона — не `localhost`, а IP Mac (`NETWORK_FIX.md`).  
3. Логи `[API CONFIG]` и `[API]` в Metro.  
4. OpenRouter 401 — `be/.env`, `API_SETUP.md`.  
5. Expo Go + HTTP — `HTTP_WORKAROUND.md`.

## Типичное

| Ошибка | Действие |
|--------|----------|
| Network request failed | IP, Wi‑Fi, `HOST=0.0.0.0`, `.env` |
| 401 analyze | `OPENROUTER_API_KEY` |
| CORS | `CORS_ORIGIN` на бэкенде |

Конфиг URL: `API_URL_CONFIG.md`.
