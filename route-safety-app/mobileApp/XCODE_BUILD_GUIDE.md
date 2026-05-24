# Сборка на iPhone через Xcode (бесплатный Apple ID)

`react-native-maps` — нужен dev build, не Expo Go.

## 1. Открыть проект

```bash
cd mobileApp
open ios/RouteSafetyApp.xcworkspace
```

Только `.xcworkspace`, не `.xcodeproj`. Открытие Xcode само по себе ничего на телефон не ставит.

## 2. iPhone по USB

Разблокировать, «Доверять этому компьютеру».

## 3. Signing

Project `RouteSafetyApp` → Target `RouteSafetyApp` → **Signing & Capabilities**:

- Automatically manage signing
- Team — твой Apple ID (Add Account… если нет)
- Bundle ID уникальный, если занят: `com.<имя>.routesafety`

## 4. Устройство и Run

Вверху выбрать iPhone → **Run (▶️)** или `Cmd+R`.  
Первая сборка долгая. Product → Clean Build Folder — если что-то сломалось.

## 5. Доверие на iPhone

Настройки → Основные → VPN и управление устройством → профиль разработчика → Доверять.

## 6. Metro (обязательно)

Иначе «no development server found»:

```bash
cd mobileApp
npx expo start --dev-client
```

iPhone и Mac в одной Wi‑Fi. URL из терминала (`exp://…`) или QR.

## Частые проблемы

**Workspace открыл — приложения нет** — не нажали Run.

**No accounts with team** — Add Account в Xcode.

**Bundle ID занят** — сменить в Signing / `app.json`, при необходимости:

```bash
rm -rf ios && npx expo prebuild --platform ios
```

**no development server** — Metro с `--dev-client`, одна сеть с Mac.

**Бесплатный Apple ID** — сборка живёт ~7 дней, потом снова Run в Xcode (или `eas build`).

## Кратко

```bash
open ios/RouteSafetyApp.xcworkspace
# Signing + Run в Xcode
# Доверие на iPhone
npx expo start --dev-client
```
