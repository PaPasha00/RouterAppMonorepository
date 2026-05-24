# Запуск на iPhone (dev)

1. `cd be && npm run dev` — бэкенд на `:3001`, `HOST=0.0.0.0`.
2. `cd mobileApp && npx expo start`.
3. iPhone и Mac в одной Wi‑Fi.
4. Открыть проект в Expo Go или dev build (карты в Go ограничены — см. `EXPO_GO_LIMITATION.md`).

URL API: `config/api.ts` или `.env` с `EXPO_PUBLIC_API_BASE_URL`.

Если `Network request failed` — `NETWORK_FIX.md`.

Standalone без Metro — `BUILD_INSTRUCTIONS.md`.
