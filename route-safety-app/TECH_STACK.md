# Технологии проекта (Tech Stack)

Краткий обзор технологий по частям монорепозитория.

## Backend (`route-safety-app/be`)

- **Язык/платформа**: Node.js (требование `>= 20`), **TypeScript**
- **HTTP API**: **Express 5**
- **Запуск в разработке**: `ts-node-dev` (hot-reload), `dotenv` для переменных окружения
- **HTTP-клиент**: `axios` (запросы к внешним сервисам)
- **Аутентификация**:
  - **JWT**: `jsonwebtoken`
  - **Хэширование паролей**: `bcryptjs`
- **Хранилище/БД**: **SQLite** через `better-sqlite3`
- **CORS**: `cors`
- **Утилиты**: `uuid`
- **Контейнеризация/деплой**:
  - `be/Dockerfile` и корневой `route-safety-app/Dockerfile` (Node 20 alpine)
  - Порт контейнера: **`3001`** (EXPOSE 3001)

## Mobile App (`route-safety-app/mobileApp`)

- **Платформа**: **React Native** + **Expo**
- **Навигация/роутинг**: **expo-router**, `@react-navigation/*` (bottom tabs / navigation)
- **Язык**: **TypeScript**
- **Хранилище**:
  - `@react-native-async-storage/async-storage`
  - `expo-secure-store` (секьюрное хранилище)
- **Геолокация**: `expo-location`
- **Карты**: `react-native-maps`
- **UI/системные модули Expo**:
  - `expo-image`, `expo-file-system`, `expo-haptics`, `expo-blur`, `expo-web-browser`,
    `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`
- **Жесты/анимации**: `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`
- **Поддержка Dev Client**: `expo-dev-client`

## Связка Mobile ↔ Backend (URL API)

- **Базовый URL API** вычисляется в `mobileApp/config/api.ts`.
- **Порт backend** ожидается как **`3001`**.
- **Переопределение URL** возможно через `EXPO_PUBLIC_API_BASE_URL` (из Expo config / env).
  В DEV-режиме для физического устройства также используется автоопределение IP хоста по `hostUri`
  (чтобы не “залипал” старый IP при смене сети).

