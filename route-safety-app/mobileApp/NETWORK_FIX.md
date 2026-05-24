# Network request failed (телефон не видит бэкенд)

Обычно телефон стучится не туда: localhost с устройства — это сам телефон, не Mac.

## Чеклист

1. Бэкенд запущен, слушает `0.0.0.0:3001`:

```bash
cd be
npm run dev
```

2. IP Mac в той же Wi‑Fi:

```bash
ipconfig getifaddr en0
```

3. URL в `mobileApp/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://ВАШ_IP:3001
```

В dev IP часто подхватывается из Expo `hostUri` (`config/api.ts`), но если кэш мешает — явный `.env` надёжнее.

4. Перезапуск Metro:

```bash
cd mobileApp
npx expo start --clear
```

5. iPhone и Mac в одной сети, файрвол не режет 3001.

В логах приложения должен быть тот же URL, что в `.env`.

## Production

После деплоя бэкенда:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-host.railway.app
```

или EAS secret с тем же именем.
