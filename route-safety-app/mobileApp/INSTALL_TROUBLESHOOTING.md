# Не ставится / не открывается на iPhone

## Untrusted developer

Настройки → Основные → VPN и управление устройством → профиль → Доверять.

## Signing / provisioning

Xcode → `RouteSafetyApp` → Signing & Capabilities:

- Automatically manage signing
- Team = Apple ID
- Уникальный Bundle ID

Занят ID — поменять в `app.json` и Signing:

```bash
rm -rf ios && npx expo prebuild --platform ios --clean
```

## Integrity / cannot verify

Телефон разблокирован, старое приложение удалить, собрать заново (Run в Xcode).

## Прошло 7 дней (бесплатный Apple ID)

Пересборка: Run в Xcode или `eas build --platform ios --profile development`.

## Установка через Xcode

```bash
cd mobileApp && open ios/RouteSafetyApp.xcworkspace
```

USB, Signing, Run. Полный чеклист: `XCODE_BUILD_GUIDE.md`.

## EAS .ipa

```bash
eas build --platform ios --profile development
```

Установка через Safari / AltStore / Xcode → Devices.

## Жёсткий сброс ios/

```bash
cd mobileApp
rm -rf ios
npx expo prebuild --platform ios --clean
open ios/RouteSafetyApp.xcworkspace
```

Новый bundle id в `app.json`, если конфликт не уходит.

## CocoaPods

```bash
cd mobileApp/ios
pod deintegrate && pod install
```
