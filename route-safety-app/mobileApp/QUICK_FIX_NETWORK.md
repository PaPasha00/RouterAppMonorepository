# Network request failed — быстро

```bash
# IP Mac
ipconfig getifaddr en0

# mobileApp/.env
EXPO_PUBLIC_API_BASE_URL=http://ВАШ_IP:3001

# бэкенд
cd be && npm run dev   # HOST=0.0.0.0 в .env

# Metro
cd mobileApp && npx expo start --clear
```

Одна Wi‑Fi с iPhone. Подробнее: `NETWORK_FIX.md`.
