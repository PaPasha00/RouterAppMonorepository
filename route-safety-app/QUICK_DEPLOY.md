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

**✅ Способ 1: Использовать Railway Config File (рекомендуется)**

В репозитории уже есть файл `be/railway.json`, который автоматически настроит все параметры! Railway обнаружит его автоматически.

**Что нужно сделать:**

1. **⚠️ КРИТИЧЕСКИ ВАЖНО: Установите Root Directory в `be`:**

   - Откройте сервис в Railway
   - Перейдите в **Settings** → **Build & Deploy**
   - Найдите поле **"Root Directory"** или **"Source Root"**
   - **Установите значение: `be`** (без слешей, без точек, просто `be`)
   - Это единственная настройка, которую нужно указать вручную
   - **Без этого Railway не найдет Dockerfile и package.json!**

   **Если Root Directory не установлен в `be`, вы получите ошибку:**

   - `"/package.json": not found`
   - `"Dockerfile does not exist"`

2. **Railway автоматически использует конфигурацию:**

   - `be/railway.json` - указывает использовать NIXPACKS builder
   - `be/nixpacks.toml` - явно указывает Node.js 20 и команды сборки
   - `be/.nvmrc` - указывает версию Node.js 20
   - `be/package.json` - содержит engines с версией Node.js
   - Builder: NIXPACKS (автоматически определит Node.js проект)

   **⚠️ КРИТИЧЕСКИ ВАЖНО:** Убедитесь, что в Railway → Settings → Build & Deploy → **Root Directory** = `be`

**✅ Способ 2: Ручная настройка (если не хотите использовать config file)**

1. **Откройте созданный сервис** (кликните на него в списке проектов)

2. **Перейдите в настройки:**

   - Нажмите на вкладку **"Settings"** (или **"⚙️ Settings"**) в верхней панели
   - Или нажмите на три точки (⋮) рядом с названием сервиса → **"Settings"**

3. **Найдите раздел "Build & Deploy"** и настройте:

   - **Root Directory**: `be`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Сохраните изменения** (Railway обычно сохраняет автоматически)

**💡 Важно:**

- **Railway Config File (`be/railway.json`)** автоматически настроит все команды - это самый надежный способ!
- Если Railway не находит `package.json`, он может попросить выбрать тип сервиса - выберите **"Node.js"** или **"Nixpacks"**.
- Главное - убедитесь, что **Root Directory** = `be` в настройках Railway.

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

**⚠️ Если получили ошибку "npm: not found":**

Это означает, что Railway не определил Node.js проект. Решение:

1. **Убедитесь, что Root Directory установлен в `be`** (см. шаг 3)
2. **В репозитории есть два конфигурационных файла:**
   - `be/railway.json` - основной конфигурационный файл Railway
   - `be/nixpacks.toml` - конфигурация для Nixpacks builder
3. **Если ошибка все еще есть:**
   - В настройках Railway → **Settings** → **Build & Deploy**
   - Убедитесь, что **Root Directory** = `be`
   - Найдите поле **"Builder"** или **"Buildpack"**
   - Убедитесь, что выбран **"Nixpacks"** (не Docker)
   - Или явно укажите: **"Node.js"** в типе сервиса
4. **Перезапустите деплой** (кнопка **"Redeploy"**)

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
{ "status": "OK", "timestamp": "2024-..." }
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

### ❌ "npm: not found" или "sh: 1: npm: not found"

**Проблема:** Railway не может найти npm при сборке проекта.

**Решение:**

1. **Проверьте Root Directory:**

   - В Railway → Settings → Build & Deploy
   - Убедитесь, что **Root Directory** = `be`
   - Это критически важно! Railway должен искать `package.json` в папке `be`

2. **Файл `nixpacks.toml` уже создан:**

   - В репозитории есть файл `be/nixpacks.toml`
   - Он явно указывает Railway использовать Node.js 20
   - Убедитесь, что этот файл закоммичен в Git

3. **Проверьте тип сервиса:**

   - В Railway → Settings
   - Убедитесь, что выбран **"Nixpacks"** (не Docker)
   - Или явно выберите **"Node.js"**

4. **Перезапустите деплой:**

   - Нажмите **"Redeploy"** в Railway
   - Или сделайте новый коммит в Git (Railway автоматически перезапустит)

5. **Если все еще не работает:**
   - Удалите сервис в Railway
   - Создайте новый сервис заново
   - Убедитесь, что Root Directory = `be` с самого начала

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
