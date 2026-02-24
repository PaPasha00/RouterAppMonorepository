import { LatLngTuple, ElevationResponse } from '../types';

/**
 * Получает данные о высотах через API
 */
export const getElevationData = async (coordinates: LatLngTuple[]): Promise<number[]> => {
  try {
    // Ограничиваем количество точек для запроса
    const limitedCoords = coordinates.slice(0, 100);
    
    console.log(`Requesting elevation data for ${limitedCoords.length} coordinates`);
    
    // Делаем запрос к серверу
    const response = await fetch('http://localhost:3001/api/elevation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: limitedCoords })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ElevationResponse = await response.json();
    
    if (data.results && data.results.length > 0) {
      const elevations = data.results.map((result) => result.elevation);
      
      // Проверяем качество данных
      const validElevations = elevations.filter(elev => 
        elev !== null && elev !== undefined && !isNaN(elev) && elev >= -500 && elev <= 10000
      );
      
      if (validElevations.length === 0) {
        console.warn('All elevation data is invalid, using simulation');
        // return simulateElevationData(coordinates);
      }
      
      if (validElevations.length < elevations.length) {
        console.warn(`Only ${validElevations.length} out of ${elevations.length} elevation points are valid`);
      }
      
      const minElev = Math.min(...validElevations);
      const maxElev = Math.max(...validElevations);
      console.log(`Elevation data received: min=${minElev}m, max=${maxElev}m, valid points=${validElevations.length}`);
      
      return elevations;
    } else if (data.status === 'ERROR') {
      throw new Error('Elevation data error');
    } else {
      throw new Error('No elevation data received');
    }
  } catch (error) {
    console.error('Error fetching elevation data:', error);
    
    // // Возвращаем заглушку с случайными высотами для демонстрации
    // console.log('Using simulated elevation data for demo');
    // return simulateElevationData(coordinates);
  }
};

/**
 * Генерирует демо-данные о высотах с учетом региона
 */
// export const simulateElevationData = (coordinates: LatLngTuple[]): number[] => {
//   if (coordinates.length === 0) return [];
  
//   const elevations: number[] = [];
  
//   // Определяем базовую высоту в зависимости от региона
//   const getBaseElevation = (lat: number, lng: number): number => {
//     // Гималаи (включая Эверест)
//     if (lat >= 27 && lat <= 30 && lng >= 85 && lng <= 88) {
//       return 4000 + Math.random() * 2000; // 4000-6000м
//     }
    
//     // Альпы
//     if (lat >= 45 && lat <= 48 && lng >= 6 && lng <= 14) {
//       return 1000 + Math.random() * 2000; // 1000-3000м
//     }
    
//     // Кавказ
//     if (lat >= 42 && lat <= 44 && lng >= 40 && lng <= 46) {
//       return 1500 + Math.random() * 1500; // 1500-3000м
//     }
    
//     // Урал
//     if (lat >= 55 && lat <= 60 && lng >= 55 && lng <= 65) {
//       return 200 + Math.random() * 800; // 200-1000м
//     }
    
//     // Прибрежные районы
//     if (Math.abs(lat) < 30) {
//       return 0 + Math.random() * 100; // 0-100м
//     }
    
//     // Обычные равнины
//     return 100 + Math.random() * 300; // 100-400м
//   };
  
//   let currentElevation = getBaseElevation(coordinates[0][0], coordinates[0][1]);
  
//   for (let i = 0; i < coordinates.length; i++) {
//     const [lat, lng] = coordinates[i];
    
//     // Обновляем базовую высоту для текущей точки
//     const baseElevation = getBaseElevation(lat, lng);
    
//     // Плавный переход между точками
//     const targetElevation = baseElevation + (Math.random() - 0.5) * 200;
//     currentElevation = currentElevation * 0.7 + targetElevation * 0.3;
    
//     // Добавляем небольшие колебания
//     const change = (Math.random() - 0.5) * 50;
//     currentElevation = Math.max(0, currentElevation + change);
    
//     elevations.push(Math.round(currentElevation));
//   }
  
//   return elevations;
// };
