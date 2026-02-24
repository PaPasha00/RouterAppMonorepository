# Установка приложения БЕЗ Xcode

## Вариант 1: EAS Build (Облачная сборка) - Рекомендуется ✅

EAS Build собирает приложение в облаке, Xcode не нужен!

### Шаги:

1. **Убедитесь, что вы авторизованы в Expo:**
   ```bash
   cd mobileApp
   eas whoami
   ```
   
   Если не авторизованы:
   ```bash
   eas login
   ```

2. **Настройте учетные данные Apple (бесплатный Apple ID):**
   ```bash
   eas credentials
   ```
   
   Выберите:
   - Platform: `ios`
   - Profile: `development` (для тестирования) или `preview`
   - Credentials provider: выберите "Local credentials" или введите ваш бесплатный Apple ID
   
   EAS спросит о сертификатах - выберите **"Generate new"** или **"Automatic"**

3. **Запустите сборку:**
   ```bash
   eas build --platform ios --profile development
   ```
   
   Или для preview версии:
   ```bash
   eas build --platform ios --profile preview
   ```

4. **Дождитесь завершения сборки** (обычно 10-20 минут)

5. **После сборки вы получите:**
   - Ссылку на `.ipa` файл
   - QR-код для скачивания
   - Ссылку в терминале и на сайте expo.dev

6. **Установите на iPhone:**

   **Способ A: Через Safari на iPhone**
   - Откройте ссылку на `.ipa` в Safari на iPhone
   - Нажмите "Скачать"
   - После скачивания: **Настройки > Основные > VPN и управление устройством**
   - Найдите профиль и нажмите **"Доверять"**
   - Откройте приложение

   **Способ B: Через AltStore** (если Safari не работает)
   - Установите AltStore на Mac/PC: https://altstore.io
   - Установите AltStore на iPhone через AltServer
   - Скачайте `.ipa` файл
   - Откройте в AltStore и установите

   **Способ C: Через 3uTools** (Windows/Mac)
   - Установите 3uTools: https://www.3u.com
   - Подключите iPhone
   - Перетащите `.ipa` файл в 3uTools
   - Нажмите "Установить"

---

## Вариант 2: Использовать Expo Go (Ограниченный функционал)

⚠️ **Внимание**: Ваше приложение использует `react-native-maps`, который не работает в Expo Go. Но можно попробовать для базового тестирования.

```bash
cd mobileApp
npx expo start
```

Затем:
- Установите Expo Go из App Store на iPhone
- Отсканируйте QR-код из терминала
- Приложение откроется в Expo Go

**Ограничения:**
- Карты могут не работать
- Некоторые нативные функции недоступны

---

## Вариант 3: Использовать Android (Полностью бесплатно)

Android сборка не требует Xcode и работает без ограничений:

```bash
cd mobileApp
eas build --platform android --profile preview
```

После сборки:
- Скачайте `.apk` файл
- Установите на Android устройство
- Разрешите установку из неизвестных источников

---

## Быстрый старт (EAS Build)

```bash
cd mobileApp

# 1. Проверьте авторизацию
eas whoami

# 2. Настройте учетные данные (один раз)
eas credentials

# 3. Запустите сборку
eas build --platform ios --profile development

# 4. Дождитесь завершения и скачайте .ipa
# 5. Установите на iPhone через Safari, AltStore или 3uTools
```

---

## Решение проблем

### "Credentials not found"
```bash
eas credentials
# Настройте учетные данные заново
```

### "Build failed"
- Проверьте логи на сайте expo.dev
- Убедитесь, что все файлы ресурсов на месте (icon.png, splash.png)
- Проверьте bundle identifier в app.json

### "Cannot install .ipa"
- На iPhone: **Настройки > Основные > VPN и управление устройством**
- Найдите профиль разработчика и нажмите **"Доверять"**
- Убедитесь, что устройство разблокировано

---

## Полезные ссылки

- EAS Build Dashboard: https://expo.dev/accounts/pavelvasev0000/projects/route-safety-app/builds
- AltStore: https://altstore.io
- 3uTools: https://www.3u.com

