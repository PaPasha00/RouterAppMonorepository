# Запуск приложения на iPhone

## Проблема: "Could not connect to the server"

Эта ошибка означает, что приложение не может подключиться к Metro bundler (сервер разработки Expo).

## Решение

### Вариант 1: Запустить Metro bundler вручную

1. **Откройте терминал и запустите:**
   ```bash
   cd mobileApp
   npx expo start
   ```

2. **Убедитесь, что iPhone и Mac в одной Wi-Fi сети**

3. **В Xcode нажмите Run (▶️) снова**

### Вариант 2: Использовать Development Build (рекомендуется)

Если вы собрали приложение через Xcode, лучше использовать Development Build:

1. **Запустите Metro bundler:**
   ```bash
   cd mobileApp
   npx expo start --dev-client
   ```

2. **В Xcode запустите приложение (Run ▶️)**

3. **В приложении на iPhone:**
   - Откроется экран с QR-кодом
   - Отсканируйте QR-код или введите URL вручную
   - Приложение подключится к Metro bundler

### Вариант 3: Использовать локальный IP вместо localhost

Если iPhone и Mac в одной сети:

1. **Узнайте IP адрес Mac:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   
   Или в System Preferences > Network

2. **В Xcode измените URL:**
   - Откройте `ios/RouteSafetyApp/Info.plist`
   - Найдите `EXUpdatesURL` или создайте переменную окружения
   - Используйте IP вместо localhost

3. **Или запустите Expo с явным указанием хоста:**
   ```bash
   npx expo start --host tunnel
   ```

---

## Правильный порядок запуска

1. **Запустите Metro bundler:**
   ```bash
   cd mobileApp
   npx expo start --dev-client
   ```

2. **В Xcode:**
   - Подключите iPhone
   - Выберите устройство
   - Нажмите Run (▶️)

3. **В приложении на iPhone:**
   - Если появится экран подключения, введите URL из терминала
   - Или отсканируйте QR-код

---

## Проверка подключения

Убедитесь, что:
- ✅ Metro bundler запущен (видите QR-код в терминале)
- ✅ iPhone и Mac в одной Wi-Fi сети
- ✅ Брандмауэр не блокирует подключение
- ✅ Порт 8081 или 8085 не занят другим процессом

---

## Альтернатива: Production Build

Если хотите запустить приложение без Metro bundler (standalone):

1. **В Xcode:**
   - Product > Scheme > Edit Scheme
   - Run > Build Configuration: **Release**
   - Product > Archive
   - Distribute App > Development
   - Установите на устройство

2. **Или через EAS Build:**
   ```bash
   eas build --platform ios --profile production --local
   ```

Но для этого нужен платный Apple Developer аккаунт.

---

## Быстрое решение

Просто запустите в терминале:

```bash
cd mobileApp
npx expo start --dev-client
```

Затем в Xcode нажмите Run (▶️) снова.

