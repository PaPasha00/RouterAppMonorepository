# Исправление ошибки "Network request failed"

## Проблема
Приложение не может подключиться к бэкенду с ошибкой "Network request failed".

## Решение

### 1. Проверьте, что бэкенд запущен

```bash
cd be
npm run dev
```

Убедитесь, что бэкенд слушает на `0.0.0.0:3001` (не только localhost).

### 2. Узнайте IP адрес вашего компьютера

```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Или для Wi-Fi
ipconfig getifaddr en0
```

### 3. Обновите конфигурацию

**Вариант A: Через .env файл (рекомендуется)**

Создайте или обновите `mobileApp/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=http://172.20.10.2:3001
```
(Замените `172.20.10.2` на ваш IP адрес)

**Вариант B: Через app.config.js**

В `mobileApp/app.config.js` уже установлен IP `172.20.10.2`. Если ваш IP другой, обновите:
```javascript
EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://ВАШ-IP:3001",
```

### 4. Перезапустите Expo

```bash
cd mobileApp
# Остановите текущий процесс (Ctrl+C)
npx expo start --clear
```

Или перезапустите приложение на устройстве.

### 5. Проверьте подключение

В консоли приложения должно быть видно правильный URL:
```
API_CONFIG.BASE_URL: http://172.20.10.2:3001
```

### 6. Убедитесь, что устройства в одной сети

- iPhone и Mac должны быть в одной Wi-Fi сети
- Проверьте, что файрвол не блокирует порт 3001

---

## Быстрое решение

1. **Узнайте IP:**
   ```bash
   ipconfig getifaddr en0
   ```

2. **Обновите .env:**
   ```bash
   cd mobileApp
   echo "EXPO_PUBLIC_API_BASE_URL=http://ВАШ-IP:3001" > .env
   ```

3. **Перезапустите Expo:**
   ```bash
   npx expo start --clear
   ```

---

## Для production

После деплоя бэкенда на сервер, обновите URL:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

Или через EAS secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com
```

