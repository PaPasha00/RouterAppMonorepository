# Решение проблем с установкой на iPhone

## Частые ошибки и решения

### 1. "Не удается установить приложение" / "Unable to install app"

#### Причина: Проблемы с подписью (Signing)

**Решение:**

1. **Проверьте настройки Signing в Xcode:**
   - Откройте `ios/RouteSafetyApp.xcworkspace` в Xcode
   - Выберите проект `RouteSafetyApp` в навигаторе
   - Перейдите в раздел "Signing & Capabilities"
   - Убедитесь, что выбрана опция "Automatically manage signing"
   - Выберите ваш Team (Apple ID)
   - Bundle Identifier должен быть уникальным (например, `com.routesafety.app` или `com.yourname.routesafety`)

2. **Если Bundle Identifier занят:**
   - Измените его на уникальный в Xcode или в `app.json`:
   ```json
   "bundleIdentifier": "com.yourname.routesafety"
   ```

3. **Очистите и пересоберите:**
   ```bash
   cd mobileApp
   rm -rf ios/build
   # В Xcode: Product > Clean Build Folder (Shift+Cmd+K)
   # Затем: Product > Build (Cmd+B)
   ```

---

### 2. "Untrusted Developer" / "Ненадежный разработчик"

**Решение:**

1. На iPhone перейдите: **Настройки > Основные > VPN и управление устройством** (или **Профили и управление устройством**)
2. Найдите ваш профиль разработчика
3. Нажмите на него и выберите **"Доверять"**

---

### 3. "The app cannot be installed because its integrity could not be verified"

**Решение:**

1. Убедитесь, что устройство разблокировано
2. Проверьте, что вы используете правильный Apple ID для подписи
3. Попробуйте удалить старое приложение и установить заново

---

### 4. "This app cannot be installed because a valid provisioning profile was not found"

**Решение:**

1. В Xcode: **Signing & Capabilities**
2. Нажмите **"Download Manual Profiles"** или выберите **"Automatically manage signing"**
3. Убедитесь, что ваш Apple ID добавлен в Team

---

### 5. Проблемы с бесплатным Apple ID (7-дневное ограничение)

Если приложение перестало работать через 7 дней:

1. **Пересоберите приложение:**
   ```bash
   cd mobileApp
   # В Xcode: Product > Clean Build Folder
   # Product > Build
   # Product > Run
   ```

2. **Или используйте EAS Build:**
   ```bash
   eas build --platform ios --profile development
   ```

---

## Пошаговая инструкция для установки через Xcode

1. **Откройте проект:**
   ```bash
   cd mobileApp
   open ios/RouteSafetyApp.xcworkspace
   ```

2. **Подключите iPhone к Mac** через USB

3. **Разблокируйте iPhone** и разрешите доверие компьютеру

4. **В Xcode:**
   - Выберите ваше устройство в верхней панели (рядом с кнопкой Run)
   - Если устройства нет в списке:
     - На iPhone: **Настройки > Основные > VPN и управление устройством**
     - Нажмите на профиль компьютера и выберите **"Доверять"**

5. **Настройте Signing:**
   - Выберите проект `RouteSafetyApp` в навигаторе
   - Target: `RouteSafetyApp`
   - Вкладка **"Signing & Capabilities"**
   - ✅ **"Automatically manage signing"**
   - Team: выберите ваш Apple ID
   - Bundle Identifier: измените на уникальный, если нужно

6. **Соберите и установите:**
   - Нажмите **Run** (▶️) или `Cmd+R`
   - Xcode соберет и установит приложение на iPhone

---

## Альтернативные способы установки

### Через EAS Build (облачная сборка)

1. **Соберите через EAS:**
   ```bash
   cd mobileApp
   eas build --platform ios --profile development
   ```

2. **После сборки получите ссылку на .ipa файл**

3. **Установите через:**
   - **AltStore** (требует AltServer на Mac/PC)
   - **3uTools** (Windows/Mac)
   - **Xcode** (перетащите .ipa в Devices and Simulators)

### Через TestFlight (требует платную подписку)

1. Соберите production версию:
   ```bash
   eas build --platform ios --profile production
   ```

2. Загрузите в App Store Connect:
   ```bash
   eas submit --platform ios
   ```

3. Добавьте тестеров в TestFlight

---

## Проверка настроек

### Проверьте Bundle Identifier:

```bash
cd mobileApp
grep -r "PRODUCT_BUNDLE_IDENTIFIER" ios/
```

Убедитесь, что он уникален и соответствует `app.json`.

### Проверьте сертификаты:

В Xcode: **Window > Devices and Simulators**
- Выберите ваше устройство
- Проверьте, что приложение установлено
- Если есть ошибки, они будут показаны здесь

---

## Если ничего не помогает

1. **Очистите все:**
   ```bash
   cd mobileApp
   rm -rf ios/
   npx expo prebuild --platform ios --clean
   ```

2. **Создайте новый Bundle Identifier:**
   - В `app.json` измените на что-то уникальное:
   ```json
   "bundleIdentifier": "com.yourname.routesafetyapp"
   ```

3. **Пересоберите:**
   ```bash
   open ios/RouteSafetyApp.xcworkspace
   # В Xcode: Product > Clean Build Folder
   # Product > Build
   ```

---

## Полезные команды

```bash
# Очистить кэш CocoaPods
cd mobileApp/ios
pod deintegrate
pod install

# Очистить build
rm -rf ios/build
rm -rf ios/DerivedData

# Пересоздать нативный проект
rm -rf ios/
npx expo prebuild --platform ios
```

