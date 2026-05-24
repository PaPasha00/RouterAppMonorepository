import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

console.log('Переменные окружения:');
console.log(`OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'настроен' : 'НЕ НАЙДЕН'}`);
const tavilyKey = process.env.TAVILY_API_KEY;
if (tavilyKey) {
  console.log(`TAVILY_API_KEY: настроен (${tavilyKey.substring(0, 15)}...)`);
} else {
  console.log(`TAVILY_API_KEY: НЕ НАЙДЕН (web search будет недоступен)`);
  console.log(`   Добавь TAVILY_API_KEY в be/.env и перезапусти сервер`);
}
console.log(`PORT: ${process.env.PORT || 'не задан'}`);

function main(): void {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  app.listen(PORT, HOST, () => {
    console.log(`Backend http://${HOST}:${PORT}`);
    console.log(`Health http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
    console.log(`NODE_ENV=${NODE_ENV}`);
    if (HOST === '0.0.0.0') {
      console.log(`LAN: http://<ip>:${PORT}`);
    }
    if (process.env.CORS_ORIGIN) {
      console.log(`CORS_ORIGIN=${process.env.CORS_ORIGIN}`);
    }
  });
}

main();
