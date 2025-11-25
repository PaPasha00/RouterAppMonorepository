# 🚀 Быстрый деплой бэкенда на сервер

## Шаг 1: Выберите платформу для деплоя

### Вариант A: Railway (самый простой, бесплатный план)
### Вариант B: Render (бесплатный план)
### Вариант C: VPS сервер (Ubuntu/Debian)

---

## 🎯 Вариант A: Деплой на Railway (рекомендуется)

### 1. Подготовка

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Подключите ваш GitHub репозиторий

### 2. Создайте новый проект

1. В Railway нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий `route-safety-app`

### 3. Настройте сервис

1. Railway автоматически определит проект
2. В настройках проекта:
   - **Root Directory**: `be`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 4. Добавьте переменные окружения

В настройках проекта → **Variables** добавьте:

```env
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-здесь
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=*
JWT_SECRET=сгенерируйте-случайную-строку-32+-символов
```

**Как сгенерировать JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Деплой

1. Railway автоматически начнет деплой
2. Дождитесь завершения (обычно 2-3 минуты)
3. Railway создаст URL вида: `https://your-app-name.up.railway.app`

### 6. Обновите мобильное приложение

Обновите `mobileApp/app.config.js`:

```javascript
extra: {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "https://your-app-name.up.railway.app",
  // ...
}
```

Или создайте `.env` файл в `mobileApp/`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-app-name.up.railway.app
```

### 7. Пересоберите приложение

```bash
cd mobileApp
# Для iOS
npx expo prebuild --platform ios
# Затем в Xcode нажмите Run
```

---

## 🎯 Вариант B: Деплой на Render

### 1. Подготовка

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Подключите ваш GitHub репозиторий

### 2. Создайте новый Web Service

1. Нажмите **"New +"** → **"Web Service"**
2. Выберите ваш репозиторий

### 3. Настройте сервис

- **Name**: `route-safety-api`
- **Root Directory**: `be`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Добавьте переменные окружения

В разделе **Environment** добавьте те же переменные, что и для Railway.

### 5. Деплой

1. Нажмите **"Create Web Service"**
2. Render создаст URL вида: `https://route-safety-api.onrender.com`

### 6. Обновите мобильное приложение

Аналогично варианту A, замените URL на URL от Render.

---

## 🎯 Вариант C: Деплой на VPS (Ubuntu/Debian)

### 1. Подключитесь к серверу

```bash
ssh user@your-server-ip
```

### 2. Установите Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Установите PM2

```bash
sudo npm install -g pm2
```

### 4. Загрузите код на сервер

```bash
# На вашем компьютере
cd be
scp -r . user@your-server-ip:/opt/route-safety-backend

# Или используйте git
git clone your-repo-url
cd route-safety-app/be
```

### 5. Настройте на сервере

```bash
# На сервере
cd /opt/route-safety-backend
npm install
npm run build

# Создайте .env файл
nano .env
```

Вставьте в `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=*
JWT_SECRET=сгенерируйте-случайную-строку
```

### 6. Запустите с PM2

```bash
pm2 start dist/index.js --name route-safety-api
pm2 startup
pm2 save
pm2 logs route-safety-api
```

### 7. Настройте файрвол

```bash
sudo ufw allow 3001/tcp
```

### 8. Обновите мобильное приложение

В `mobileApp/app.config.js`:

```javascript
EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://your-server-ip:3001",
```

---

## ✅ Проверка работы

### 1. Проверьте бэкенд

```bash
# Для Railway/Render
curl https://your-app-url/health

# Для VPS
curl http://your-server-ip:3001/health
```

Должен вернуться:
```json
{"status":"OK","timestamp":"2024-..."}
```

### 2. Проверьте мобильное приложение

1. Обновите конфигурацию (см. выше)
2. Пересоберите приложение
3. Запустите и попробуйте выполнить запрос к API

---

## 🔧 Обновление мобильного приложения после деплоя

### Способ 1: Через app.config.js (рекомендуется)

Отредактируйте `mobileApp/app.config.js`:

```javascript
extra: {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "https://your-deployed-api-url.com",
  // ...
}
```

### Способ 2: Через .env файл

Создайте `mobileApp/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-api-url.com
```

### Способ 3: Через переменные окружения при сборке

```bash
cd mobileApp
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-api-url.com npx expo prebuild --platform ios
```

---

## 🆘 Решение проблем

### "Connection refused" или "Network error"

- Проверьте, что бэкенд запущен и доступен
- Проверьте URL в `EXPO_PUBLIC_API_BASE_URL`
- Убедитесь, что используется HTTPS для production (Railway/Render)
- Проверьте CORS настройки

### "CORS error"

- В `.env` бэкенда установите `CORS_ORIGIN=*` (для тестирования)
- Или укажите конкретные домены: `CORS_ORIGIN=https://yourdomain.com`

### Приложение не подключается к API

1. Проверьте логи бэкенда
2. Проверьте URL в консоли приложения (должен выводиться в логах)
3. Убедитесь, что пересобрали приложение после изменения конфигурации

---

## 📝 Быстрая команда для обновления URL

После деплоя выполните:

```bash
# 1. Обновите app.config.js с новым URL
# 2. Пересоберите iOS проект
cd mobileApp
rm -rf ios/
npx expo prebuild --platform ios

# 3. В Xcode нажмите Run
```

---

## 🎉 Готово!

Теперь ваше приложение будет подключаться к задеплоенному бэкенду вместо localhost!

