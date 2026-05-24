# Как выбирается URL API

Код: `mobileApp/config/api.ts`.

## Порядок (dev)

1. `EXPO_PUBLIC_API_BASE_URL` из `.env` или `app.config.js` extra  
2. В `__DEV__`: IP из Expo `hostUri` / `debuggerHost` → `http://<ip>:3001`  
3. Симулятор / Android emulator → localhost или `10.0.2.2`  
4. Иначе localhost:3001  

## Production (не __DEV__)

`http://46.188.41.57:3011` по умолчанию, если env не задан.

Переопределение:

```env
EXPO_PUBLIC_API_BASE_URL=https://твой-хост
```

## Логи

При старте смотри `[API CONFIG]` — там финальный URL.

В dev URL пересчитывается каждый раз (без залипания кэша).

## Телефон не видит Mac

`NETWORK_FIX.md` — чаще всего не тот IP или бэкенд не на `0.0.0.0`.
