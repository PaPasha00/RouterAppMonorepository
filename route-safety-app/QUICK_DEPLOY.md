# Деплой бэкенда

Кратко, как я выкатываю `be` на Railway. Render/VPS — та же идея: Node 20, `npm run build`, `npm start`, env из списка ниже.

## Railway

1. Проект из GitHub, сервис на репозиторий монорепо.
2. **Root Directory** — важно:
   - если Railway смотрит на корень монорепо: `route-safety-app/be`
   - если уже внутри `route-safety-app`: `be`
3. Builder: **Nixpacks** (не Docker), конфиги уже в `be/railway.json`, `be/nixpacks.toml`, `be/.nvmrc`.
4. Variables:

```env
OPENROUTER_API_KEY=sk-or-v1-...
TAVILY_API_KEY=tvly-...          # опционально
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=*
JWT_SECRET=<случайная строка 32+ символа>
```

JWT: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. После деплоя — URL вида `https://xxx.up.railway.app`, health: `/health`.

## Мобилка после деплоя

`mobileApp/.env` или EAS:

```env
EXPO_PUBLIC_API_BASE_URL=https://xxx.up.railway.app
```

Пересобрать/перезапустить Expo.

## Частые косяки

| Симптом | Что проверить |
|--------|----------------|
| `Dockerfile does not exist` | Root Directory не туда — нужен каталог с `be/package.json` |
| `npm: not found` | Root Directory / Nixpacks, не Docker |
| 401 на анализ | `OPENROUTER_API_KEY` в Variables |
| CORS с телефона | `CORS_ORIGIN`, `HOST=0.0.0.0` |

Подробнее по VPS и Render — `DEPLOYMENT_GUIDE.md`.
