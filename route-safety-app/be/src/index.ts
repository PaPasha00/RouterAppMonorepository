import dotenv from 'dotenv';
import { createApp } from './app';

// Загружаем переменные окружения
dotenv.config();

// Проверяем загрузку переменных
console.log('🔑 Проверка переменных окружения:');
console.log(`OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'настроен' : 'НЕ НАЙДЕН'}`);
console.log(`PORT: ${process.env.PORT || 'не задан'}`);

/**
 * Главная точка входа приложения
 */
function main(): void {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Бэкенд запущен на http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
    console.log(`🌍 Окружение: ${NODE_ENV}`);
    if (HOST === '0.0.0.0') {
      console.log(`🌐 Доступен по IP: http://<ваш-ip>:${PORT}`);
    }
    if (process.env.CORS_ORIGIN) {
      console.log(`🔒 CORS origins: ${process.env.CORS_ORIGIN}`);
    }
  });
}

// Запускаем приложение
main();
