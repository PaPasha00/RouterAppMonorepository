# Expo Go — ограничения

В Go не поднимется полноценно:

- `react-native-maps` (нативные карты)
- cleartext HTTP к своему API (см. `HTTP_WORKAROUND.md`)

Для нормальной работы — dev build (`npx expo run:ios` / EAS) и `npx expo start --dev-client`.

Сборка: `XCODE_BUILD_GUIDE.md`, `FREE_BUILD_GUIDE.md`.
