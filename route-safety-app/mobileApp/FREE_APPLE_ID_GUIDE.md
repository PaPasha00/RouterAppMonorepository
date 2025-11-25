# Сборка БЕЗ платного Apple Developer аккаунта и Xcode

## ✅ Что вам НЕ нужно:
- ❌ Платный Apple Developer аккаунт ($99/год)
- ❌ Xcode
- ❌ Mac (для облачной сборки)

## ✅ Что вам нужно:
- ✅ Бесплатный Apple ID (создать на https://appleid.apple.com)
- ✅ Компьютер с интернетом (любой - Windows, Mac, Linux)
- ✅ iPhone

---

## Пошаговая инструкция

### Шаг 1: Создайте бесплатный Apple ID (если нет)

1. Перейдите на https://appleid.apple.com
2. Нажмите "Создать Apple ID"
3. Заполните форму (email, пароль, вопросы безопасности)
4. Подтвердите email

**Это полностью бесплатно!**

---

### Шаг 2: Настройте EAS Build с бесплатным Apple ID

```bash
cd mobileApp

# Настройте учетные данные
eas credentials
```

**Что выбрать:**
- Platform: `ios`
- Profile: `preview` (для установки на устройство)
- Credentials provider: выберите **"Local credentials"** или введите ваш **бесплатный Apple ID**
- При запросе о сертификатах: выберите **"Generate new"** или **"Automatic"**

EAS автоматически создаст сертификаты для бесплатного Apple ID.

---

### Шаг 3: Запустите сборку

```bash
eas build --platform ios --profile preview
```

**Что происходит:**
- EAS собирает приложение в облаке (на серверах Expo)
- Вам не нужен Xcode или Mac
- Сборка займет 10-20 минут

---

### Шаг 4: Установите на iPhone

После завершения сборки:

1. **Получите ссылку на .ipa файл** (будет в терминале и на сайте expo.dev)

2. **На iPhone:**
   - Откройте Safari
   - Перейдите по ссылке на .ipa файл
   - Нажмите "Скачать"
   - После скачивания откройте файл

3. **Доверьте разработчику:**
   - На iPhone: **Настройки > Основные > VPN и управление устройством**
   - Найдите профиль разработчика (ваш Apple ID)
   - Нажмите на него
   - Выберите **"Доверять"**

4. **Откройте приложение** на iPhone

---

## ⚠️ Важное ограничение

С **бесплатным Apple ID**:
- ✅ Приложение работает **7 дней**
- ✅ После 7 дней нужно **пересобрать** (запустить `eas build` снова)
- ✅ Можно устанавливать на несколько устройств

**Это нормально для тестирования!** Каждую неделю просто пересобирайте приложение.

---

## Альтернатива: Android (без ограничений)

Если хотите избежать ограничения 7 дней, соберите для Android:

```bash
cd mobileApp
eas build --platform android --profile preview
```

**Android:**
- ✅ Полностью бесплатно
- ✅ Без ограничений по времени
- ✅ Можно установить на любое Android устройство
- ✅ Не нужен никакой аккаунт

---

## Быстрый старт

```bash
# 1. Перейдите в папку проекта
cd mobileApp

# 2. Настройте учетные данные (один раз)
eas credentials
# Выберите: ios, preview, введите бесплатный Apple ID

# 3. Запустите сборку
eas build --platform ios --profile preview

# 4. Дождитесь завершения (10-20 минут)
# 5. Скачайте .ipa и установите на iPhone
# 6. Доверьте разработчику в настройках iPhone
```

---

## Решение проблем

### "Invalid credentials"
- Убедитесь, что используете правильный Apple ID
- Попробуйте: `eas credentials` и настройте заново

### "Bundle identifier already exists"
- Измените bundle identifier в `app.json`:
  ```json
  "bundleIdentifier": "com.yourname.routesafety"
  ```
- Затем: `rm -rf ios/ && npx expo prebuild --platform ios`

### "Cannot install app"
- На iPhone: **Настройки > Основные > VPN и управление устройством**
- Найдите профиль и нажмите **"Доверять"**
- Убедитесь, что устройство разблокировано

---

## Полезные ссылки

- Создать Apple ID: https://appleid.apple.com
- EAS Build Dashboard: https://expo.dev/accounts/pavelvasev0000/projects/route-safety-app/builds
- Документация EAS: https://docs.expo.dev/build/introduction/

