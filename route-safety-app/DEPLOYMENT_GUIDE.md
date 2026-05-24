# Деплой бэкенда и env

Краткая шпаргалка. Быстрый Railway — в `QUICK_DEPLOY.md`.

## be/.env

```bash
cd be && cp .env.example .env
```

```env
OPENROUTER_API_KEY=sk-or-v1-...
TAVILY_API_KEY=tvly-...          # по желанию
PORT=3001
HOST=0.0.0.0
JWT_SECRET=<случайная строка 32+>
CORS_ORIGIN=*                    # на проде — конкретные домены
NODE_ENV=production
```

JWT: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## VPS (Ubuntu)

```bash
# на сервере
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

cd /opt/route-safety-backend   # скопировал be сюда (git/scp)
npm install && npm run build
nano .env                      # env как выше

pm2 start dist/index.js --name route-safety-api
pm2 startup && pm2 save
```

HTTPS — nginx reverse proxy на `:3001`, дальше certbot.

## Railway / Render

- Root: `be` (или `route-safety-app/be` из корня монорепо)
- Build: `npm install && npm run build`
- Start: `npm start`
- Те же Variables, что в `.env`

## Мобилка

Локально — `mobileApp/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3001
```

Прод — URL деплоя в `.env`, `app.config.js` extra или EAS secret `EXPO_PUBLIC_API_BASE_URL`.

Логика выбора URL: `mobileApp/config/api.ts`, `API_URL_CONFIG.md`.

## Проверка

```bash
curl http://localhost:3001/health
# {"status":"OK",...}
```

## Типичные ошибки

| Симптом | Что смотреть |
|--------|----------------|
| CORS | `CORS_ORIGIN`, URL в приложении |
| Connection refused | бэкенд запущен, `HOST=0.0.0.0`, порт в файрволе |
| JWT invalid | один `JWT_SECRET` на все инстансы |

## Команды

```bash
cd be && npm run dev    # dev
cd be && npm run build && npm start   # prod локально
pm2 logs route-safety-api

cd mobileApp && npx expo start
eas build --platform ios --profile preview
```
