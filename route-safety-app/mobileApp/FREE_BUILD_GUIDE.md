# Бесплатная сборка для iOS (без платной подписки)

## Варианты без платной подписки Apple Developer ($99/год)

### ⚠️ Важно
Приложение использует `react-native-maps`, который требует нативной сборки. **Expo Go не подойдет** для полного функционала.

## Вариант 1: Development Build с бесплатным Apple ID (Рекомендуется)

### Преимущества:
- ✅ Полностью бесплатно
- ✅ Все функции работают
- ✅ Можно установить на свой iPhone

### Недостатки:
- ⚠️ Приложение работает только **7 дней** на устройстве
- ⚠️ Нужно пересобирать каждую неделю
- ⚠️ Нужен бесплатный Apple ID

### Шаги:

1. **Создайте бесплатный Apple ID** (если еще нет):
   - Перейдите на https://appleid.apple.com
   - Создайте аккаунт

2. **Настройте EAS проект**:
   ```bash
   cd mobileApp
   eas project:init
   ```

3. **Настройте учетные данные с бесплатным Apple ID**:
   ```bash
   eas credentials
   ```
   
   Выберите:
   - Platform: `ios`
   - Profile: `development`
   - Credentials provider: выберите "Local" или введите бесплатный Apple ID
   
   EAS спросит о сертификатах - выберите **"Generate new"** или **"Automatic"**

4. **Соберите development build**:
   ```bash
   eas build --platform ios --profile development
   ```

5. **Установите на iPhone**:
   - После сборки получите ссылку на `.ipa`
   - Установите через:
     - **AltStore** (требует AltServer на Mac/PC)
     - **3uTools** (Windows/Mac)
     - **Xcode** (если есть Mac)

### Обновление каждые 7 дней:

Когда приложение перестанет работать (через 7 дней):
```bash
eas build --platform ios --profile development
```

Установите новую версию на устройство.

---

## Вариант 2: Использовать Expo Development Build (через EAS)

Этот вариант также использует бесплатный Apple ID, но сборка происходит в облаке:

```bash
cd mobileApp
eas build --platform ios --profile development --local=false
```

При запросе учетных данных используйте бесплатный Apple ID.

---

## Вариант 3: Локальная сборка (если есть Mac)

Если у вас есть Mac (но без Xcode или платной подписки):

1. **Установите Xcode Command Line Tools** (бесплатно):
   ```bash
   xcode-select --install
   ```

2. **Создайте нативный проект**:
   ```bash
   cd mobileApp
   npx expo prebuild --platform ios
   ```

3. **Откройте в Xcode**:
   ```bash
   open ios/route-safety-app.xcworkspace
   ```

4. **Настройте подпись**:
   - В Xcode: Project Settings > Signing & Capabilities
   - Выберите "Automatically manage signing"
   - Выберите ваш бесплатный Apple ID (Team)
   - Bundle Identifier должен быть уникальным (измените если нужно)

5. **Соберите и установите**:
   - Подключите iPhone
   - Выберите устройство в Xcode
   - Нажмите Run (▶️)
   - Приложение установится на iPhone

⚠️ **Ограничение**: Приложение будет работать только 7 дней, затем нужно пересобрать.

---

## Вариант 4: Использовать Android (полностью бесплатно)

Android сборка полностью бесплатна и без ограничений:

```bash
cd mobileApp
eas build --platform android --profile preview
```

Или локально:
```bash
npx expo run:android
```

---

## Рекомендации

1. **Для разработки и тестирования**: Используйте Вариант 1 (Development Build через EAS)
2. **Для постоянного использования**: Рассмотрите покупку Apple Developer аккаунта ($99/год)
3. **Для быстрого тестирования**: Используйте iOS Simulator на Mac (если есть)

---

## Часто задаваемые вопросы

**Q: Можно ли продлить срок действия приложения?**  
A: Нет, с бесплатным аккаунтом приложение работает только 7 дней. Нужно пересобирать.

**Q: Можно ли установить на несколько устройств?**  
A: Да, но каждое устройство нужно добавить в Provisioning Profile (через Apple Developer Portal или автоматически через EAS).

**Q: Работает ли это для публикации в App Store?**  
A: Нет, для App Store нужна платная подписка Apple Developer.

---

## Быстрый старт (Development Build)

```bash
cd mobileApp
eas project:init  # ответьте "yes"
eas credentials   # выберите ios, development, используйте бесплатный Apple ID
eas build --platform ios --profile development
```

После сборки установите `.ipa` файл на iPhone через AltStore, 3uTools или Xcode.

