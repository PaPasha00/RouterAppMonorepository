// Проверка elevation API в разных регионах
const testLocations = [
  { name: 'Москва', coords: [[55.7558, 37.6176]] },
  { name: 'Эверест', coords: [[27.9881, 86.9250]] },
  { name: 'Альпы', coords: [[46.5197, 7.4815]] },
];

async function testElevation(name, coordinates) {
  console.log(`\n--- ${name} ---`);
  try {
    const response = await fetch('http://localhost:3001/api/elevation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });

    if (!response.ok) {
      console.log(`HTTP ${response.status}`);
      return;
    }

    const data = await response.json();
    const elevation = data.results?.[0]?.elevation;
    if (elevation !== undefined) {
      console.log(`Высота: ${elevation}м`);
      if (elevation === 0) console.log('(0 — возможно нет данных)');
    } else {
      console.log('Нет данных о высоте');
    }
  } catch (error) {
    console.log(`Ошибка: ${error.message}`);
    console.log('Сервер на localhost:3001 запущен?');
  }
}

async function runTests() {
  for (const loc of testLocations) {
    await testElevation(loc.name, loc.coords);
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log('\nГотово.');
}

runTests();
