# HTTP и dev build

Expo Go режет cleartext к внешнему API. Для `http://…:3001` нужен development build.

## Собрать один раз

iOS:

```bash
cd mobileApp
npx expo prebuild --clean
npx expo run:ios
```

Android:

```bash
npx expo run:android
```

## Запуск

```bash
npx expo start --dev-client
```

## Что уже в конфиге

`app.config.js` / `Info.plist`:

- iOS: `NSAllowsArbitraryLoads`, исключения для IP API и localhost
- Android: `usesCleartextTraffic: true`

Production API сейчас `http://46.188.41.57:3011` — в dev часто свой IP, см. `NETWORK_FIX.md`.

## Проверка

В логах приложения:

```
[API CONFIG] Определен базовый URL: http://...
[API] Ответ получен: { status: 200, ... }
```

Сеть: `NETWORK_FIX.md`, Expo Go: `EXPO_GO_LIMITATION.md`.
