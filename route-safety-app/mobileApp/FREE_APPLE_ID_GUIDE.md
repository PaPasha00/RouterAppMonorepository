# Сборка без платного Developer и без Xcode

Нужны: бесплатный Apple ID, интернет, iPhone.

## EAS (облако)

```bash
cd mobileApp
eas login                   # если не залогинен
eas credentials             # ios, profile preview, Apple ID
eas build --platform ios --profile preview
```

10–20 минут. Ссылка на `.ipa` в терминале и на expo.dev.

Установка: Safari на iPhone → скачать → Настройки → VPN и управление устройством → Доверять.

Срок жизни сборки на бесплатном аккаунте — около 7 дней, потом снова `eas build`.

## Android вместо iOS

```bash
eas build --platform android --profile preview
```

Без недельного лимита.

## Проблемы

**Invalid credentials** — `eas credentials` заново.

**Bundle ID занят** — в `app.json` другой `bundleIdentifier`, при необходимости `rm -rf ios && npx expo prebuild --platform ios`.

**Не ставится** — доверие профилю на iPhone, телефон разблокирован.

Apple ID: https://appleid.apple.com  
Билды: https://expo.dev (проект route-safety-app)
