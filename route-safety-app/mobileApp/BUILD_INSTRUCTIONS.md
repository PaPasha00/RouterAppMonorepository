# Инструкция по сборке приложения для iOS

## Предварительные требования

1. **Apple Developer аккаунт** (стоимость $99/год)
   - Необходим для подписи приложения
   - Можно использовать бесплатный аккаунт для разработки (но с ограничениями)

2. **Установлен EAS CLI** (уже установлен)

## Шаги для сборки

### 1. Создать EAS проект (если еще не создан)

```bash
cd mobileApp
eas project:init
```

При запросе ответьте "yes" для создания проекта.

### 2. Настроить Apple Developer аккаунт

Для iOS сборки нужно настроить учетные данные Apple Developer:

```bash
eas credentials
```

Выберите:
- Platform: `ios`
- Выберите профиль: `preview` (для тестирования) или `production` (для App Store)

EAS предложит несколько вариантов:
- **Automatic (Recommended)** - EAS управляет сертификатами автоматически
- **Manual** - вы управляете сертификатами вручную

Рекомендуется выбрать Automatic.

### 3. Запустить сборку

#### Для внутреннего тестирования (preview):
```bash
eas build --platform ios --profile preview
```

#### Для публикации в App Store (production):
```bash
eas build --platform ios --profile production
```

### 4. Установка на iPhone

После завершения сборки:

1. **Через TestFlight** (рекомендуется):
   - Соберите production версию
   - Загрузите в App Store Connect через `eas submit`
   - Добавьте тестеров в TestFlight
   - Они получат приглашение на email

2. **Прямая установка** (для preview сборки):
   - После сборки вы получите ссылку на `.ipa` файл
   - Установите через Xcode или через веб-интерфейс EAS

### Альтернативный способ (локальная сборка)

Если у вас есть Mac с Xcode:

```bash
# Создать нативный проект
npx expo prebuild --platform ios

# Открыть в Xcode
open ios/route-safety-app.xcworkspace

# В Xcode: Product > Archive
```

## Важные замечания

1. **Bundle Identifier**: Убедитесь, что `com.routesafety.app` уникален. Если он занят, измените в `app.json`

2. **API URL**: В `app.json` указан локальный IP `http://172.20.10.3:3001`. Для production нужно:
   - Использовать публичный URL бэкенда
   - Или настроить переменные окружения для разных профилей сборки

3. **Иконка и Splash**: Убедитесь, что файлы `./assets/icon.png` и `./assets/splash.png` существуют

## Быстрый старт

Если у вас уже настроен Apple Developer аккаунт:

```bash
cd mobileApp
eas build --platform ios --profile preview
```

Следуйте инструкциям в терминале для настройки учетных данных.

