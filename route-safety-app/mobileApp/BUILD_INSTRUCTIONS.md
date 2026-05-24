# Сборка iOS через EAS

## Платный Developer ($99/год)

Нужен для TestFlight / App Store. Для себя на телефоне хватает бесплатного Apple ID — см. `FREE_BUILD_GUIDE.md`.

## EAS

```bash
cd mobileApp
eas project:init
eas credentials    # ios, preview или production, Automatic
```

Preview (тест на устройстве):

```bash
eas build --platform ios --profile preview
```

Production (магазин):

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Локально с Xcode

```bash
npx expo prebuild --platform ios
open ios/RouteSafetyApp.xcworkspace
```

Дальше `XCODE_BUILD_GUIDE.md`.

## На что смотреть

- `bundleIdentifier` в `app.json` — уникальный (`com.routesafety.app` или свой).
- API URL на проде — не локальный IP; `EXPO_PUBLIC_API_BASE_URL` / EAS env.
- `assets/icon.png`, `assets/splash.png` на месте.

## Быстрый preview

```bash
cd mobileApp
eas build --platform ios --profile preview
```
