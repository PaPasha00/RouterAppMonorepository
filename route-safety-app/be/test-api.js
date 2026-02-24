// Тестовый скрипт для проверки настройки API ключа
require('dotenv').config();

console.log('🔑 Проверка настройки API ключа...\n');

if (!process.env.OPENROUTER_API_KEY) {
  console.log('❌ OPENROUTER_API_KEY не найден в переменных окружения');
  console.log('📝 Создайте файл .env в папке be/ со следующим содержимым:');
  console.log('');
  console.log('OPENROUTER_API_KEY=your_actual_api_key_here');
  console.log('PORT=3001');
  console.log('');
  console.log('📖 Подробная инструкция: API_SETUP.md');
  process.exit(1);
}

if (process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here' || 
    process.env.OPENROUTER_API_KEY === 'your_actual_api_key_here') {
  console.log('⚠️  API ключ не заменен на реальный');
  console.log('📝 Замените your_actual_api_key_here на ваш реальный ключ из OpenRouter');
  process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
  console.log('⚠️  API ключ не соответствует формату OpenRouter');
  console.log('📝 Убедитесь, что используете ключ от OpenRouter (начинается с sk-or-v1-)');
  process.exit(1);
}

console.log('✅ API ключ настроен корректно');
console.log(`🔑 Ключ: ${process.env.OPENROUTER_API_KEY.substring(0, 20)}...`);
console.log('🚀 Теперь ИИ анализ должен работать');
