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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Бэкенд запущен на http://0.0.0.0:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Доступен по IP: http://<ваш-ip>:${PORT}`);
  });
}

// Запускаем приложение
main();
