# Env для локалки

## be/.env

```bash
cd be
cp .env.example .env
```

Минимум:

```env
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=<случайная строка>
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=*
NODE_ENV=development
```

Опционально: `TAVILY_API_KEY=tvly-...` — веб-поиск в анализе.

## mobileApp/.env

```bash
cd mobileApp
cp .env.example .env
```

IP Mac (`ipconfig getifaddr en0`):

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3001
```

На телефоне в dev URL часто берётся из Expo hostUri без `.env` — см. `config/api.ts`.

## Запуск

```bash
# терминал 1
cd be && npm run dev

# терминал 2
cd mobileApp && npx expo start
```

Ключ OpenRouter: `API_SETUP.md`. Сеть: `mobileApp/NETWORK_FIX.md`.
