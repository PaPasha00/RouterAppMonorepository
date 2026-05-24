// Проверка OPENROUTER_API_KEY
require('dotenv').config();

console.log('Проверка OPENROUTER_API_KEY...\n');

if (!process.env.OPENROUTER_API_KEY) {
  console.log('Ключ не найден. Создай be/.env:');
  console.log('OPENROUTER_API_KEY=sk-or-v1-...');
  console.log('PORT=3001');
  console.log('См. API_SETUP.md');
  process.exit(1);
}

if (
  process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here' ||
  process.env.OPENROUTER_API_KEY === 'your_actual_api_key_here'
) {
  console.log('В .env всё ещё placeholder — подставь реальный ключ.');
  process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
  console.log('Ключ должен начинаться с sk-or-v1- (OpenRouter).');
  process.exit(1);
}

console.log('OK:', process.env.OPENROUTER_API_KEY.substring(0, 20) + '...');
