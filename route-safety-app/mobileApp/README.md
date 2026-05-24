# Mobile (Expo)

Маршруты на карте, анализ через `be` на `:3001`.

```bash
npm install
npx expo start
```

Бэкенд локально:

```bash
cd ../be && npm run dev
```

Если с телефона `Network request failed` — `NETWORK_FIX.md`.  
URL API: `config/api.ts`, переопределение в `.env` (`EXPO_PUBLIC_API_BASE_URL`).

Сборка iOS/Android — `BUILD_INSTRUCTIONS.md`, `XCODE_BUILD_GUIDE.md`.
