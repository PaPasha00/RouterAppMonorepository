# Быстрая настройка переменных окружения

## 🚀 Быстрый старт

### 1. Бэкенд

```bash
cd be
cp .env.example .env
nano .env  # или откройте в редакторе
```

**Минимальные настройки:**
```env
OPENROUTER_API_KEY=ваш-ключ-от-openrouter
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=*
NODE_ENV=development
```

### 2. Мобильное приложение

```bash
cd mobileApp
cp .env.example .env
nano .env  # или откройте в редакторе
```

**Для локальной разработки:**
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001
```
(Замените `192.168.1.100` на IP вашего компьютера)

**Для production:**
```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### 3. Узнайте IP адрес вашего компьютера

```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Или
ipconfig getifaddr en0  # для Wi-Fi
ipconfig getifaddr en1  # для Ethernet
```

---

## 📦 Деплой на сервер

### Шаг 1: Подготовьте .env на сервере

```bash
# На сервере
cd /opt/route-safety-backend
nano .env
```

Вставьте:
```env
OPENROUTER_API_KEY=ваш-ключ
JWT_SECRET=случайная-строка-32+
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

### Шаг 2: Запустите с PM2

```bash
npm install
npm run build
pm2 start dist/index.js --name route-safety-api
pm2 save
```

### Шаг 3: Обновите мобильное приложение

В `mobileApp/.env` или `mobileApp/app.json`:
```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

Или через EAS:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com
```

---

## ✅ Проверка

```bash
# Проверьте бэкенд
curl http://localhost:3001/health

# Или на сервере
curl https://api.yourdomain.com/health
```

Должен вернуться: `{"status":"OK","timestamp":"..."}`

---

Подробная инструкция: см. `DEPLOYMENT_GUIDE.md`

