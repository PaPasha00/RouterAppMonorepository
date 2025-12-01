# Как заставить HTTP работать в Expo

## Проблема

Expo Go блокирует HTTP запросы к внешним серверам из соображений безопасности.

## Решение: Development Build

Для работы с HTTP запросами **обязательно** нужно использовать Development Build, а не Expo Go.

### Шаг 1: Создайте Development Build

**Для iOS:**

```bash
cd mobileApp
npx expo prebuild --clean
npx expo run:ios
```

**Для Android:**

```bash
cd mobileApp
npx expo prebuild --clean
npx expo run:android
```

### Шаг 2: Запустите с dev-client

После создания build, запустите:

```bash
npx expo start --dev-client
```

### Что было настроено:

1. **app.config.js**:

   - `NSAllowsArbitraryLoads: true` для iOS
   - `usesCleartextTraffic: true` для Android
   - Исключения для `46.188.41.57`, `localhost`, `172.20.10.3`
   - Production URL: `http://46.188.41.57:3011`

2. **Info.plist**:

   - `NSAllowsArbitraryLoads: true`
   - Исключения для всех нужных доменов

3. **app.json**:
   - Те же настройки для совместимости

### Важно:

⚠️ **Expo Go НЕ ПОДДЕРЖИВАЕТ HTTP запросы к внешним серверам!**

Это ограничение самого приложения Expo Go, которое нельзя обойти. Development Build - единственный способ использовать HTTP запросы.

### После создания Development Build:

1. Приложение будет использовать ваши настройки безопасности
2. HTTP запросы будут работать
3. Все API вызовы будут проходить успешно

### Проверка:

После запуска Development Build проверьте логи:

```
[API CONFIG] Определен базовый URL: http://46.188.41.57:3011
[API] Отправка запроса: { url: 'http://46.188.41.57:3011/api/...' }
[API] Ответ получен: { status: 200, ... }
```

Если видите эти логи и статус 200 - все работает!
