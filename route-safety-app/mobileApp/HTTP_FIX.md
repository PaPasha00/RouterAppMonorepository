# HTTP / ATS на iOS

Настройки в `app.config.js` и `ios/RouteSafetyApp/Info.plist` — разрешён cleartext к API-серверу.

Если запросы всё равно падают — ты в Expo Go: нужен dev build, см. `HTTP_WORKAROUND.md`.

После смены IP в ATS — пересобрать нативный проект (`npx expo prebuild` или Run в Xcode).
