# Route Safety App - Монорепозиторий

Приложение для анализа безопасности туристических маршрутов с веб-интерфейсом и мобильным приложением.

## 🏗️ Структура проекта

```
route-safety-app/
├── be/                    # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── controllers/   # Контроллеры API
│   │   ├── services/      # Бизнес-логика
│   │   ├── helpers/       # Вспомогательные функции
│   │   ├── routes/        # Маршруты API
│   │   ├── types/         # TypeScript типы
│   │   ├── app.ts         # Конфигурация Express
│   │   └── index.ts       # Точка входа
│   ├── package.json
│   └── tsconfig.json
├── fe/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── helpers/       # Вспомогательные функции
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript типы
│   │   └── App.tsx        # Главный компонент
│   ├── package.json
│   └── tsconfig.json
└── mobileApp/             # Mobile App (React Native + Expo)
    ├── app/               # Экранные компоненты
    ├── components/        # Переиспользуемые компоненты
    ├── package.json
    └── app.json
```

## Быстрый старт

### Backend

```bash
cd be
npm install
npm run dev
```

API: `http://localhost:3001` (health: `/health`)

### Frontend

```bash
cd fe
npm install
npm start
```

Порт смотри в выводе Vite (обычно 5173).

### Mobile App

```bash
cd mobileApp
npm install
npm start
```

Откройте приложение в Expo Go на телефоне.

## 📋 Функции

### Backend API

- **Elevation Service**: Получение данных о высотах
- **Route Analysis**: Анализ маршрутов с ИИ
- **Map Service**: Интеграция с картами (Google, Yandex, OSM)
- **Daily Planning**: Разбивка маршрутов по дням
- **Weather Integration**: Прогнозы погоды

### Frontend

- **Интерактивная карта**: Leaflet.js с возможностью рисования
- **Анализ маршрутов**: Форма с параметрами туризма
- **Дневные планы**: Разбивка маршрута по дням
- **Перетаскиваемые окна**: UI с drag & drop
- **Попап результаты**: Отдельные окна для анализа

### Mobile App

- **Карты**: Интеграция с различными провайдерами
- **Поиск мест**: Поиск через Nominatim API
- **GPS**: Определение местоположения
- **Офлайн режим**: Работа без интернета

## 🛠️ Технологии

### Backend
- **Node.js** + **Express**
- **TypeScript** для типизации
- **OpenRouter AI** для анализа маршрутов
- **OpenTopoData** для данных о высотах
- **Nominatim** для геокодирования

### Frontend
- **React** + **TypeScript**
- **Leaflet.js** для карт
- **SCSS Modules** для стилей
- **Custom Hooks** для интерактивности

### Mobile
- **React Native** + **Expo**
- **TypeScript**
- **Expo Location** для GPS
- **React Native WebView** для карт

## 🔧 Настройка

### Переменные окружения

Создайте файл `be/.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
GOOGLE_MAPS_API_KEY=your_google_key_here
YANDEX_MAPS_API_KEY=your_yandex_key_here
```

### API Endpoints

- `GET /api/elevation` - данные о высотах
- `POST /api/analyze-route` - анализ маршрута
- `GET /api/map/image` - изображения карт
- `GET /api/map/providers` - список провайдеров карт

## 📱 Мобильное приложение

### Настройка подключения к бэкенду

1. Найдите IP адрес вашего компьютера:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Обновите `mobileApp/config/api.ts`:
   ```typescript
   BASE_URL: 'http://YOUR_IP:3000'
   ```

3. Запустите бэкенд и мобильное приложение

## 🎯 Типы туризма

- **Пеший туризм** - пешие походы
- **Велосипедный туризм** - велопоходы
- **Водный туризм** - сплавы, каякинг
- **Автомобильный туризм** - автопутешествия
- **Воздушный туризм** - парапланеризм, дельтапланеризм
- **Мото туризм** - мотоциклетные поездки

## 📊 Анализ маршрутов

Приложение анализирует:
- **Геометрию маршрута**: длина, перепады высот
- **Тип местности**: автоматическое определение
- **Погодные условия**: прогнозы на каждый день
- **Рекомендации**: советы по безопасности
- **Дневные планы**: разбивка по дням

## 🤝 Разработка

### Структура кода

- **Модульная архитектура**: каждый компонент в отдельном файле
- **TypeScript**: строгая типизация
- **SCSS Modules**: изолированные стили
- **Custom Hooks**: переиспользуемая логика
- **Error Handling**: обработка ошибок

### Коммиты

Используйте conventional commits:
- `feat:` - новые функции
- `fix:` - исправления
- `refactor:` - рефакторинг
- `docs:` - документация

## 📄 Лицензия

MIT License

## 👥 Авторы

- **Backend**: Node.js + TypeScript
- **Frontend**: React + TypeScript  
- **Mobile**: React Native + Expo

---

**Примечание**: Для работы с картами настройте API ключи в переменных окружения.