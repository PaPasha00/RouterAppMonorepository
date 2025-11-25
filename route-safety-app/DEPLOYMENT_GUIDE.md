# Руководство по деплою бэкенда и настройке переменных окружения

## 📋 Содержание

1. [Настройка бэкенда](#настройка-бэкенда)
2. [Деплой бэкенда на сервер](#деплой-бэкенда-на-сервер)
3. [Настройка мобильного приложения](#настройка-мобильного-приложения)
4. [Проверка работы](#проверка-работы)

---

## 🔧 Настройка бэкенда

### 1. Создайте файл `.env` в папке `be/`

```bash
cd be
cp .env.example .env
```

### 2. Отредактируйте `.env` файл:

```env
# OpenRouter API Key (обязательно!)
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-здесь

# Порт сервера
PORT=3001

# Хост (0.0.0.0 для доступа извне, localhost для локального)
HOST=0.0.0.0

# JWT Secret (ОБЯЗАТЕЛЬНО измените на случайную строку!)
JWT_SECRET=ваш-случайный-секретный-ключ-минимум-32-символа

# CORS - разрешенные источники
# Для разработки:
CORS_ORIGIN=http://localhost:8081,http://localhost:19000,exp://*
# Для production (укажите домен вашего API):
CORS_ORIGIN=https://api.yourdomain.com

# Окружение
NODE_ENV=production
```

### 3. Генерация JWT_SECRET

```bash
# Сгенерируйте случайный секретный ключ:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Скопируйте результат в `JWT_SECRET`.

---

## 🚀 Деплой бэкенда на сервер

### Вариант 1: Деплой на VPS (Ubuntu/Debian)

#### 1. Подготовка сервера

```bash
# На сервере установите Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите PM2 для управления процессом
sudo npm install -g pm2
```

#### 2. Загрузите код на сервер

```bash
# На вашем компьютере
cd be
scp -r . user@your-server:/opt/route-safety-backend

# Или используйте git
git clone your-repo-url
cd route-safety-app/be
```

#### 3. Настройте на сервере

```bash
# На сервере
cd /opt/route-safety-backend
npm install
npm run build

# Создайте .env файл
nano .env
# Вставьте настройки из шага выше
```

#### 4. Запустите с PM2

```bash
# Запустите приложение
pm2 start dist/index.js --name route-safety-api

# Настройте автозапуск
pm2 startup
pm2 save

# Проверьте статус
pm2 status
pm2 logs route-safety-api
```

#### 5. Настройте Nginx (опционально, для HTTPS)

```nginx
# /etc/nginx/sites-available/route-safety-api
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/route-safety-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Настройте SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

### Вариант 2: Деплой на Railway/Render/Heroku

#### Railway

1. Подключите репозиторий на Railway
2. Укажите корневую папку: `be`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Добавьте переменные окружения в настройках проекта

#### Render

1. Создайте новый Web Service
2. Root Directory: `be`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Добавьте переменные окружения в Environment

---

## 📱 Настройка мобильного приложения

### Для разработки

1. **Создайте `.env` файл** (опционально, можно использовать app.json):

```bash
cd mobileApp
cp .env.example .env
```

2. **Отредактируйте `.env`:**

```env
# Для локальной разработки (замените на IP вашего компьютера)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001
```

3. **Или обновите `app.json`:**

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_BASE_URL": "http://192.168.1.100:3001"
    }
  }
}
```

### Для production сборки

1. **Обновите `app.json`:**

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com"
    }
  }
}
```

2. **Или используйте переменные окружения EAS:**

```bash
# Установите переменную для production сборки
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com --type string
```

3. **Обновите `eas.json`:**

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com"
      }
    }
  }
}
```

---

## ✅ Проверка работы

### 1. Проверьте бэкенд

```bash
# Локально
curl http://localhost:3001/health

# На сервере
curl http://your-server-ip:3001/health
# Или
curl https://api.yourdomain.com/health
```

Должен вернуться:

```json
{ "status": "OK", "timestamp": "2024-..." }
```

### 2. Проверьте CORS

Убедитесь, что CORS настроен правильно. Если приложение не может подключиться, проверьте:

- URL в `EXPO_PUBLIC_API_BASE_URL` правильный
- CORS_ORIGIN включает ваш домен/IP
- Порт открыт в файрволе

### 3. Проверьте мобильное приложение

1. Запустите приложение
2. Попробуйте выполнить любой запрос к API
3. Проверьте логи в консоли

---

## 🔒 Безопасность

### Production Checklist

- [ ] Измените `JWT_SECRET` на случайную строку (минимум 32 символа)
- [ ] Используйте HTTPS для API
- [ ] Настройте правильный `CORS_ORIGIN` (не используйте `*` в production)
- [ ] Используйте переменные окружения, не храните секреты в коде
- [ ] Настройте файрвол (откройте только нужные порты)
- [ ] Регулярно обновляйте зависимости: `npm audit fix`

---

## 📝 Примеры конфигураций

### Локальная разработка

**be/.env:**

```env
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:8081,http://localhost:19000,exp://*
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-production
OPENROUTER_API_KEY=your-key
```

**mobileApp/app.json:**

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_BASE_URL": "http://192.168.1.100:3001"
    }
  }
}
```

### Production

**be/.env:**

```env
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
NODE_ENV=production
JWT_SECRET=<случайная-строка-32+>
OPENROUTER_API_KEY=your-key
```

**mobileApp/app.json:**

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com"
    }
  }
}
```

---

## 🆘 Решение проблем

### "CORS error"

- Проверьте `CORS_ORIGIN` в `.env` бэкенда
- Убедитесь, что URL в приложении правильный
- Проверьте, что используется HTTPS для production

### "Connection refused"

- Проверьте, что бэкенд запущен
- Проверьте порт в файрволе
- Убедитесь, что `HOST=0.0.0.0` для доступа извне

### "JWT token invalid"

- Проверьте, что `JWT_SECRET` одинаковый на всех серверах
- Убедитесь, что токен не истек

---

## 📚 Полезные команды

```bash
# Бэкенд
cd be
npm run build          # Собрать проект
npm start              # Запустить production
npm run dev            # Запустить development

# PM2
pm2 start dist/index.js --name api
pm2 logs api
pm2 restart api
pm2 stop api

# Мобильное приложение
cd mobileApp
npx expo start         # Запустить dev server
eas build              # Собрать для production
```
