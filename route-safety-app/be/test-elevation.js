// Тестовый скрипт для проверки работы высот в разных регионах
const fetch = require('node-fetch');

const testLocations = [
  { name: 'Эверест', coords: [27.9881, 86.9250] },
  { name: 'Москва', coords: [55.7558, 37.6176] },
  { name: 'Альпы (Монблан)', coords: [45.8326, 6.8652] },
  { name: 'Кавказ (Эльбрус)', coords: [43.3550, 42.4392] },
  { name: 'Урал (Народная)', coords: [65.0333, 60.1167] },
  { name: 'Морское побережье', coords: [45.0, 35.0] }
];

async function testElevation(location) {
  try {
    console.log(`\nТестируем: ${location.name} (${location.coords[0]}, ${location.coords[1]})`);
    
    const response = await fetch('http://localhost:3001/api/elevation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: [location.coords] })
    });

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const elevation = data.results[0].elevation;
      console.log(`✅ Высота: ${elevation}м`);
      
      if (elevation > 0) {
        console.log(`✅ Данные получены успешно`);
      } else {
        console.log(`⚠️  Высота равна 0 - возможна проблема с данными`);
      }
    } else {
      console.log(`❌ Нет данных о высоте`);
    }
    
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Тестирование высот в разных регионах...');
  console.log('Убедитесь, что сервер запущен на localhost:3001');
  
  for (const location of testLocations) {
    await testElevation(location);
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Тестирование завершено');
}

runTests().catch(console.error);
