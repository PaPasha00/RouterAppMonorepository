# Установка без Xcode

## EAS Build (основной путь)

```bash
cd mobileApp
eas whoami || eas login
eas credentials        # ios, development или preview, Apple ID
eas build --platform ios --profile development
```

Ждёшь `.ipa` → Safari на iPhone или AltStore / 3uTools.

Доверие: Настройки → VPN и управление устройством.

## Expo Go

Карты в Go не работают (`EXPO_GO_LIMITATION.md`). Для UI без карты:

```bash
npx expo start
```

Expo Go из App Store, QR из терминала.

## Android

```bash
eas build --platform android --profile preview
```

`.apk` на устройство, разрешить установку из неизвестных источников.

## Если build упал

Логи на expo.dev. Проверить `app.json`, иконки, bundle id.  
Credentials: `eas credentials` с нуля.
