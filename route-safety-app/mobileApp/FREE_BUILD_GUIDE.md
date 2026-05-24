# iOS без платного Developer ($99)

Карты (`react-native-maps`) — только нативная сборка, Expo Go не подходит.

## EAS + бесплатный Apple ID

```bash
cd mobileApp
eas project:init          # если ещё не делал
eas credentials             # ios, development/preview, свой Apple ID
eas build --platform ios --profile development
```

Сборка в облаке, Xcode на Windows не нужен. На выходе `.ipa` — Safari на iPhone, AltStore или 3uTools.

Минус бесплатного аккаунта: ~7 дней на устройстве, потом пересобрать ту же команду.

## Локально на Mac (без EAS)

```bash
npx expo prebuild --platform ios
open ios/RouteSafetyApp.xcworkspace
```

Signing → Run на подключённый iPhone. Подробно: `XCODE_BUILD_GUIDE.md`.

## Android

Без лимита 7 дней:

```bash
eas build --platform android --profile preview
# или
npx expo run:android
```

## Что выбрать

- Есть Mac — часто проще Xcode + Metro (`XCODE_BUILD_GUIDE.md`).
- Нет Mac — EAS build (`INSTALL_WITHOUT_XCODE.md`).
- В App Store — нужен платный Apple Developer.
