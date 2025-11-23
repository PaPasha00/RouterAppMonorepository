import {
  View,
  Text,
  Keyboard,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, {
  Marker,
  Polyline,
  LatLng,
  MapPressEvent,
  UserLocationChangeEvent,
  UrlTile,
} from "react-native-maps";
import * as Location from "expo-location";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import PlaceSearch, {
  PlaceResult,
  PlaceSearchHandle,
} from "../../../components/PlaceSearch";
import { styles } from "./styles";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { apiPost, API_CONFIG, getApiUrl } from "../../../config/api";
import { router, useFocusEffect } from "expo-router";
import { setAnalysisResult } from "../../../store/analysisStore";
import { getElevationData } from "./helpers";
import { setCurrentRoute } from "../../../store/routeStore";
import { clearCurrentRoute } from "../../../store/routeStore";
import { clearAnalysisResult } from "../../../store/analysisStore";
import {
  getSettings,
  saveSettings,
  clearSettingsCache,
} from "../../../store/settingsStore";

// Тип карты (локально, так как больше не в настройках)
type MapType = "osm" | "yandex" | "google-satellite" | "2gis" | "apple";

// Интерфейс для точки маршрута с названием
interface WaypointWithName extends LatLng {
  name: string;
  id: string;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

// Функция для упрощения маршрута: удаляет точки из центра, которые лежат слишком близко
// Сохраняет начальные и конечные точки, а также точки с большими изменениями направления
function simplifyRoute(
  points: LatLng[],
  maxPoints: number = 100,
  minDistanceKm: number = 0.05
): LatLng[] {
  if (points.length <= maxPoints) {
    return points;
  }

  // Всегда сохраняем первую и последнюю точки
  if (points.length <= 2) {
    return points;
  }

  const simplified: LatLng[] = [points[0]]; // Начальная точка
  const endPoint = points[points.length - 1]; // Конечная точка

  // Вычисляем общее расстояние маршрута
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineKm(points[i - 1], points[i]);
  }

  // Адаптивный минимальный интервал: чем длиннее маршрут, тем больше интервал
  const adaptiveMinDistance = Math.max(
    minDistanceKm,
    totalDistance / maxPoints / 2
  );

  // Проходим по точкам и добавляем только те, которые достаточно далеко от предыдущей
  let lastAddedIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = haversineKm(points[lastAddedIndex], points[i]);

    // Добавляем точку, если она достаточно далеко, или если это важная точка поворота
    if (distance >= adaptiveMinDistance) {
      simplified.push(points[i]);
      lastAddedIndex = i;
    }
  }

  // Добавляем конечную точку, если она еще не добавлена
  if (lastAddedIndex < points.length - 1) {
    simplified.push(endPoint);
  } else if (simplified[simplified.length - 1] !== endPoint) {
    simplified.push(endPoint);
  }

  // Если все еще слишком много точек, применяем более агрессивное упрощение
  if (simplified.length > maxPoints) {
    const step = Math.ceil(simplified.length / maxPoints);
    const result: LatLng[] = [simplified[0]];
    for (let i = step; i < simplified.length - 1; i += step) {
      result.push(simplified[i]);
    }
    result.push(simplified[simplified.length - 1]);
    return result;
  }

  return simplified;
}

async function fetchRoadRoute(points: LatLng[]): Promise<LatLng[] | null> {
  try {
    const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const geom = data?.routes?.[0]?.geometry?.coordinates as
      | [number, number][]
      | undefined;
    if (!geom) return null;
    return geom.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  } catch {
    return null;
  }
}

// Функция для построения маршрута по реке (упрощенный подход)
async function fetchRiverRoute(points: LatLng[]): Promise<LatLng[] | null> {
  try {
    if (points.length < 2) {
      console.log("[RIVER] Недостаточно точек для построения маршрута");
      return null;
    }

    console.log(
      "[RIVER] Начинаем построение маршрута по реке для",
      points.length,
      "точек"
    );

    const route: LatLng[] = [];
    const MAX_DISTANCE_TO_WATERWAY = 30.0; // Максимальное расстояние до водного пути в км

    // Обрабатываем каждый сегмент между точками
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      console.log(
        `[RIVER] Обработка сегмента ${i + 1}/${
          points.length - 1
        }: [${start.latitude.toFixed(4)}, ${start.longitude.toFixed(
          4
        )}] -> [${end.latitude.toFixed(4)}, ${end.longitude.toFixed(4)}]`
      );

      // Вычисляем область поиска для этого сегмента
      const distance = haversineKm(start, end);
      const expandFactor = Math.min(0.02, Math.max(0.005, distance * 0.01));

      const minLat = Math.min(start.latitude, end.latitude) - expandFactor;
      const maxLat = Math.max(start.latitude, end.latitude) + expandFactor;
      const minLon = Math.min(start.longitude, end.longitude) - expandFactor;
      const maxLon = Math.max(start.longitude, end.longitude) + expandFactor;

      // Overpass API bbox формат: [south, west, north, east] = [min_lat, min_lon, max_lat, max_lon]
      const bbox = [minLat, minLon, maxLat, maxLon].join(",");

      console.log(
        `[RIVER] Область поиска для сегмента ${
          i + 1
        }: bbox=${bbox}, расширение=${expandFactor.toFixed(4)}`
      );

      // Overpass API запрос для получения водных путей в области
      const overpassQuery = `[out:json][timeout:30];
(
  way["waterway"~"^(river|stream|canal|ditch|drain)$"]["waterway"!="dam"]["waterway"!="weir"](bbox:${bbox});
);
out geom;`;

      // Пробуем несколько Overpass API серверов
      const overpassServers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
      ];

      let overpassData: any = null;

      for (const server of overpassServers) {
        try {
          console.log(
            `[RIVER] Запрос к Overpass API (${server}) для сегмента ${i + 1}`
          );
          const overpassResponse = await fetch(server, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(overpassQuery)}`,
          });

          if (overpassResponse.ok) {
            overpassData = await overpassResponse.json();
            console.log(
              `[RIVER] Успешный ответ от ${server} для сегмента ${i + 1}`
            );
            console.log(`[RIVER] Статус ответа: ${overpassResponse.status}`);
            console.log(
              `[RIVER] Найдено водных путей: ${
                overpassData.elements?.length || 0
              }`
            );
            // Логируем формат координат первого водного пути для отладки
            if (overpassData.elements && overpassData.elements.length > 0) {
              const firstWay = overpassData.elements[0];
              if (firstWay.geometry && firstWay.geometry.length > 0) {
                const firstPoint = firstWay.geometry[0];
                console.log(
                  `[RIVER] Пример координат первого водного пути:`,
                  firstPoint,
                  `(тип: ${typeof firstPoint.lat}, ${typeof firstPoint.lon})`
                );
                // Пробуем извлечь координаты
                let testLat: number | undefined, testLon: number | undefined;
                if (Array.isArray(firstPoint)) {
                  [testLat, testLon] = firstPoint;
                  console.log(
                    `[RIVER] Координаты как массив: [${testLat}, ${testLon}]`
                  );
                } else if (
                  firstPoint.lat !== undefined &&
                  firstPoint.lon !== undefined
                ) {
                  testLat = firstPoint.lat;
                  testLon = firstPoint.lon;
                  console.log(
                    `[RIVER] Координаты как объект: {lat: ${testLat}, lon: ${testLon}}`
                  );
                }
                console.log(
                  `[RIVER] Точки сегмента для сравнения: start=[${start.latitude}, ${start.longitude}], end=[${end.latitude}, ${end.longitude}]`
                );
                // Вычисляем расстояние для проверки
                if (testLat !== undefined && testLon !== undefined) {
                  const testDist = haversineKm(start, {
                    latitude: testLat,
                    longitude: testLon,
                  });
                  console.log(
                    `[RIVER] Расстояние от start до первой точки водного пути: ${testDist.toFixed(
                      3
                    )} км`
                  );
                }
              }
            }
            break;
          } else {
            console.log(
              `[RIVER] ${server} вернул ошибку для сегмента ${i + 1}, статус: ${
                overpassResponse.status
              }`
            );
          }
        } catch (error) {
          console.log(
            `[RIVER] Ошибка при запросе к ${server} для сегмента ${i + 1}:`,
            error
          );
        }
      }

      if (
        !overpassData ||
        !overpassData.elements ||
        overpassData.elements.length === 0
      ) {
        console.log(`[RIVER] Водные пути не найдены для сегмента ${i + 1}`);
        return null;
      }

      // Фильтруем водные пути с валидной геометрией
      let validWaterways = overpassData.elements.filter(
        (way: any) => way.geometry && way.geometry.length >= 2
      );

      // Предварительная фильтрация: оставляем только водные пути, которые находятся близко к точкам сегмента
      // Это помогает убрать водные пути из других областей, которые случайно попали в bbox
      const PRELIMINARY_FILTER_DISTANCE = 35.0; // км (чуть больше MAX_DISTANCE_TO_WATERWAY для предварительной фильтрации)
      validWaterways = validWaterways.filter((way: any) => {
        const geometry = way.geometry;
        if (!geometry || geometry.length === 0) return false;

        // Проверяем, есть ли хотя бы одна точка геометрии близко к началу или концу сегмента
        for (const geomPoint of geometry) {
          let lat: number, lon: number;
          if (Array.isArray(geomPoint)) {
            [lat, lon] = geomPoint;
          } else if (
            geomPoint.lat !== undefined &&
            geomPoint.lon !== undefined
          ) {
            lat = geomPoint.lat;
            lon = geomPoint.lon;
          } else {
            continue;
          }

          const distToStart = haversineKm(start, {
            latitude: lat,
            longitude: lon,
          });
          const distToEnd = haversineKm(end, { latitude: lat, longitude: lon });

          if (
            distToStart <= PRELIMINARY_FILTER_DISTANCE ||
            distToEnd <= PRELIMINARY_FILTER_DISTANCE
          ) {
            return true;
          }
        }
        return false;
      });

      console.log(
        `[RIVER] После предварительной фильтрации: ${validWaterways.length} водных путей из ${overpassData.elements.length}`
      );

      if (validWaterways.length === 0) {
        console.log(
          `[RIVER] Нет валидных водных путей для сегмента ${
            i + 1
          } после фильтрации`
        );
        return null;
      }

      // Находим ближайший водный путь к начальной и конечной точкам
      let bestWaterway: any = null;
      let bestStartIdx = -1;
      let bestEndIdx = -1;
      let minTotalDistance = Infinity;

      // Собираем статистику для отладки
      const candidates: Array<{
        wayId: number;
        minStartDist: number;
        minEndDist: number;
        startIdx: number;
        endIdx: number;
        reason: string;
      }> = [];

      for (const way of validWaterways) {
        const geometry = way.geometry;

        // Находим ближайшие точки геометрии к началу и концу
        let closestStartIdx = 0;
        let closestEndIdx = 0;
        let minStartDist = Infinity;
        let minEndDist = Infinity;

        for (let j = 0; j < geometry.length; j++) {
          const geomPoint = geometry[j];

          // Overpass API может возвращать координаты как объект {lat, lon} или массив [lat, lon]
          let lat: number, lon: number;
          if (Array.isArray(geomPoint)) {
            // Формат массива [lat, lon]
            [lat, lon] = geomPoint;
          } else if (
            geomPoint.lat !== undefined &&
            geomPoint.lon !== undefined
          ) {
            // Формат объекта {lat, lon}
            lat = geomPoint.lat;
            lon = geomPoint.lon;
          } else {
            // Пропускаем некорректные точки
            console.warn(
              `[RIVER] Некорректный формат координат в точке ${j}:`,
              geomPoint
            );
            continue;
          }

          const startDist = haversineKm(start, {
            latitude: lat,
            longitude: lon,
          });
          const endDist = haversineKm(end, {
            latitude: lat,
            longitude: lon,
          });

          if (startDist < minStartDist) {
            minStartDist = startDist;
            closestStartIdx = j;
          }
          if (endDist < minEndDist) {
            minEndDist = endDist;
            closestEndIdx = j;
          }
        }

        // Проверяем условия и собираем информацию для отладки
        let reason = "";
        if (minStartDist > MAX_DISTANCE_TO_WATERWAY) {
          reason = `start too far (${minStartDist.toFixed(3)} km)`;
        } else if (minEndDist > MAX_DISTANCE_TO_WATERWAY) {
          reason = `end too far (${minEndDist.toFixed(3)} km)`;
        } else if (closestStartIdx === closestEndIdx && geometry.length > 1) {
          // Если обе точки попадают на одну и ту же точку геометрии, но геометрия длинная,
          // можно использовать соседние точки
          if (closestStartIdx === 0) {
            closestEndIdx = 1;
            minEndDist = haversineKm(end, {
              latitude: geometry[1].lat,
              longitude: geometry[1].lon,
            });
            reason = `same point, using next (idx=${closestStartIdx}->${closestEndIdx})`;
          } else if (closestStartIdx === geometry.length - 1) {
            closestEndIdx = geometry.length - 2;
            minEndDist = haversineKm(end, {
              latitude: geometry[geometry.length - 2].lat,
              longitude: geometry[geometry.length - 2].lon,
            });
            reason = `same point, using prev (idx=${closestStartIdx}->${closestEndIdx})`;
          } else {
            // Выбираем направление, которое ближе к конечной точке
            const distToNext = haversineKm(end, {
              latitude: geometry[closestStartIdx + 1].lat,
              longitude: geometry[closestStartIdx + 1].lon,
            });
            const distToPrev = haversineKm(end, {
              latitude: geometry[closestStartIdx - 1].lat,
              longitude: geometry[closestStartIdx - 1].lon,
            });
            if (distToNext < distToPrev) {
              closestEndIdx = closestStartIdx + 1;
              minEndDist = distToNext;
              reason = `same point, using next (idx=${closestStartIdx}->${closestEndIdx})`;
            } else {
              closestEndIdx = closestStartIdx - 1;
              minEndDist = distToPrev;
              reason = `same point, using prev (idx=${closestStartIdx}->${closestEndIdx})`;
            }
          }
        } else if (closestStartIdx === closestEndIdx) {
          reason = `same point, single point geometry (idx=${closestStartIdx})`;
        } else {
          reason = "OK";
        }

        // Сохраняем топ-5 кандидатов для отладки
        if (
          candidates.length < 5 ||
          minStartDist + minEndDist <
            Math.max(...candidates.map((c) => c.minStartDist + c.minEndDist))
        ) {
          candidates.push({
            wayId: way.id,
            minStartDist,
            minEndDist,
            startIdx: closestStartIdx,
            endIdx: closestEndIdx,
            reason,
          });
          candidates.sort(
            (a, b) =>
              a.minStartDist + a.minEndDist - (b.minStartDist + b.minEndDist)
          );
          if (candidates.length > 5) candidates.pop();
        }

        // Проверяем, что обе точки достаточно близки к водному пути
        // После обработки случая с одинаковыми индексами, проверяем финальные индексы
        if (
          minStartDist <= MAX_DISTANCE_TO_WATERWAY &&
          minEndDist <= MAX_DISTANCE_TO_WATERWAY &&
          closestStartIdx !== closestEndIdx
        ) {
          const totalDist = minStartDist + minEndDist;
          if (totalDist < minTotalDistance) {
            minTotalDistance = totalDist;
            bestWaterway = way;
            bestStartIdx = closestStartIdx;
            bestEndIdx = closestEndIdx;
          }
        }
      }

      if (!bestWaterway || bestStartIdx === -1 || bestEndIdx === -1) {
        console.log(
          `[RIVER] Не найден подходящий водный путь для сегмента ${
            i + 1
          } (макс. расстояние: ${MAX_DISTANCE_TO_WATERWAY} км)`
        );
        console.log(
          `[RIVER] Точки сегмента: start=[${start.latitude.toFixed(
            6
          )}, ${start.longitude.toFixed(6)}], end=[${end.latitude.toFixed(
            6
          )}, ${end.longitude.toFixed(6)}]`
        );
        console.log(`[RIVER] Топ-5 ближайших водных путей:`, candidates);
        return null;
      }

      console.log(
        `[RIVER] Найден водный путь для сегмента ${i + 1}: ID=${
          bestWaterway.id
        }, индексы: ${bestStartIdx} -> ${bestEndIdx}`
      );

      // Строим путь по геометрии водного пути
      const geometry = bestWaterway.geometry;
      const segmentPath: LatLng[] = [];

      // Определяем направление (вперед или назад по геометрии)
      const forward = bestStartIdx < bestEndIdx;
      const startIdx = forward ? bestStartIdx : bestEndIdx;
      const endIdx = forward ? bestEndIdx : bestStartIdx;

      // Функция для извлечения координат из точки геометрии
      const getCoords = (point: any): { lat: number; lon: number } => {
        if (Array.isArray(point)) {
          return { lat: point[0], lon: point[1] };
        } else if (point.lat !== undefined && point.lon !== undefined) {
          return { lat: point.lat, lon: point.lon };
        } else {
          throw new Error(
            `Некорректный формат координат: ${JSON.stringify(point)}`
          );
        }
      };

      // Добавляем начальную точку пользователя, если она не на водном пути
      const startGeomCoords = getCoords(geometry[startIdx]);
      const distToStart = haversineKm(start, {
        latitude: startGeomCoords.lat,
        longitude: startGeomCoords.lon,
      });
      if (distToStart > 0.05) {
        segmentPath.push(start);
      }

      // Добавляем точки геометрии водного пути
      for (let j = startIdx; j <= endIdx; j++) {
        const coords = getCoords(geometry[j]);
        segmentPath.push({
          latitude: coords.lat,
          longitude: coords.lon,
        });
      }

      // Добавляем конечную точку пользователя, если она не на водном пути
      const endGeomCoords = getCoords(geometry[endIdx]);
      const distToEnd = haversineKm(end, {
        latitude: endGeomCoords.lat,
        longitude: endGeomCoords.lon,
      });
      if (distToEnd > 0.05) {
        segmentPath.push(end);
      }

      // Добавляем путь сегмента к общему маршруту
      if (i === 0) {
        route.push(...segmentPath);
      } else {
        // Пропускаем первую точку, если она совпадает с последней точкой предыдущего сегмента
        const firstPoint = segmentPath[0];
        const lastPoint = route[route.length - 1];
        const dist = haversineKm(firstPoint, lastPoint);
        if (dist < 0.01) {
          route.push(...segmentPath.slice(1));
        } else {
          route.push(...segmentPath);
        }
      }

      console.log(
        `[RIVER] Сегмент ${i + 1} построен: ${segmentPath.length} точек`
      );
    }

    console.log(`[RIVER] Маршрут построен: ${route.length} точек`);
    return route.length > 0 ? route : null;
  } catch (error) {
    console.error("[RIVER] Ошибка построения маршрута:", error);
    return null;
  }
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [waypointNames, setWaypointNames] = useState<Record<number, string>>(
    {}
  );
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const [editingWaypointIndex, setEditingWaypointIndex] = useState<
    number | null
  >(null);
  const [editingWaypointName, setEditingWaypointName] = useState("");
  const [routePolyline, setRoutePolyline] = useState<LatLng[] | null>(null);

  // Данные для DraggableFlatList (объединяем точки и названия)
  const routeMenuData = useMemo(() => {
    return waypoints.map((pt, idx) => ({
      id: `waypoint-${idx}-${pt.latitude}-${pt.longitude}`, // Уникальный ID на основе координат
      coordinate: pt,
      index: idx,
      name: waypointNames[idx] || `Точка ${idx + 1}`,
    }));
  }, [waypoints, waypointNames]);

  const [routeMode, setRouteMode] = useState(false);
  const [roadRouting, setRoadRouting] = useState(false);
  const [riverRouting, setRiverRouting] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [centeredToUser, setCenteredToUser] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tourismType, setTourismType] = useState("пеший");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());
  const [mapRegion, setMapRegion] = useState<any>(null);
  const searchRef = useRef<PlaceSearchHandle>(null);
  const mapRef = useRef<MapView>(null);

  // Состояние для отображения километража на маршруте
  const [showDistanceMarkers, setShowDistanceMarkers] = useState(false);
  // Показывать ли названия точек маршрута (настройка из Settings)
  const [showWaypointNames, setShowWaypointNames] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapType, setMapType] = useState<MapType>("osm");
  const [mapKey, setMapKey] = useState(0); // Для принудительного обновления карты

  // Используем OSM по умолчанию (выбор карт убран из настроек)
  // mapType остается для внутреннего использования, но всегда использует OSM

  // Функция для генерации URL тайлов в зависимости от типа карты
  const getTileUrlTemplate = (type: MapType): string => {
    switch (type) {
      case "osm":
        // OpenStreetMap - используем стандартный сервер тайлов
        return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      case "yandex":
        // Яндекс карты - используем публичный слой
        // Формат: https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}
        return "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU";
      case "google-satellite":
        // Google Satellite - используем поддомены для балансировки нагрузки
        // Формат: https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}
        // Используем mt0, mt1, mt2, mt3 для балансировки
        return "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
      case "2gis":
        // 2ГИС - используем публичный API
        return "https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}";
      case "apple":
        // Apple Maps - используем стандартный тип карты (не тайлы)
        return "";
      default:
        return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    }
  };

  const allTourismTypes = ["пеший", "водный", "автомобильный"];

  // Функция для проверки, доступен ли тип туризма
  const isTourismTypeAvailable = (type: string): boolean => {
    if (type === "водный") {
      // Водный доступен только если выбран водный маршрут
      return riverRouting;
    }
    if (type === "автомобильный") {
      // Автомобильный доступен только если построена дорога
      return roadRouting;
    }
    return true; // Пеший всегда доступен
  };

  // Автоматически устанавливаем тип туризма при изменении режима маршрута
  useEffect(() => {
    const currentAvailable = isTourismTypeAvailable(tourismType);

    if (!currentAvailable) {
      console.log(
        `[TOURISM TYPE FIX] Текущий тип "${tourismType}" недоступен, переключаем на "пеший"`
      );
      setTourismType("пеший");
      return;
    }

    if (riverRouting) {
      // Если выбран водный маршрут, автоматически устанавливаем водный тип
      if (tourismType !== "водный") {
        setTourismType("водный");
      }
    } else if (roadRouting && tourismType === "водный") {
      // Если водный маршрут не выбран, но выбран водный тип, переключаем на пеший
      setTourismType("пеший");
    } else if (!roadRouting && tourismType === "автомобильный") {
      // Если дорога не построена, но выбран автомобильный тип, переключаем на пеший
      setTourismType("пеший");
    }
  }, [riverRouting, roadRouting]);

  const loadingSteps = [
    "Получение данных о высотах...",
    "Анализ географического контекста...",
    "Расчет геометрии маршрута...",
    "Анализ ИИ в процессе...",
    "Формирование отчета...",
  ];

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Доступ к местоположению отклонен");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setLocation(current);
    })();
  }, []);

  const initialRegion = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? 55.7558,
      longitude: location?.coords.longitude ?? 37.6176,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }),
    [location]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if ((!roadRouting && !riverRouting) || waypoints.length < 2) {
        setRoutePolyline(null);
        return;
      }
      setRoutingLoading(true);
      let poly: LatLng[] | null = null;
      if (riverRouting) {
        console.log(
          "[RIVER] Начинаем построение маршрута по реке для",
          waypoints.length,
          "точек"
        );
        try {
          poly = await fetchRiverRoute(waypoints);
          console.log(
            "[RIVER] Результат построения маршрута:",
            poly ? `${poly.length} точек` : "null"
          );
          if (!poly) {
            console.log(
              "[RIVER] Маршрут не построен - река не найдена в указанной области"
            );
          }
        } catch (error) {
          console.error("[RIVER] Ошибка при построении маршрута:", error);
        }
      } else if (roadRouting) {
        poly = await fetchRoadRoute(waypoints);
      }
      if (!cancelled) {
        setRoutePolyline(poly);
        setRoutingLoading(false);
        if (riverRouting) {
          console.log(
            "[RIVER] Маршрут установлен на карту:",
            poly ? `${poly.length} точек` : "null"
          );
          if (poly && poly.length > 0) {
            console.log("[RIVER] Первая точка маршрута:", poly[0]);
            console.log(
              "[RIVER] Последняя точка маршрута:",
              poly[poly.length - 1]
            );
            console.log("[RIVER] riverRouting:", riverRouting);
            console.log(
              "[RIVER] routePolyline будет отображен:",
              poly !== null
            );
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roadRouting, riverRouting, waypoints]);

  const onSelectPlace = (p: PlaceResult) => {
    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lon);
    const point = { latitude: lat, longitude: lon };
    setWaypoints((prev) => (routeMode ? [...prev, point] : [point]));
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500
    );
    searchRef.current?.blur();
    Keyboard.dismiss();
  };

  const dismissSearch = () => {
    searchRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { coordinate } = e.nativeEvent;
    setWaypoints((prev) => {
      const newWaypoints = routeMode ? [...prev, coordinate] : [coordinate];
      // Автоматически устанавливаем название для новой точки
      if (!routeMode) {
        setWaypointNames({ 0: "Точка 1" });
      } else {
        setWaypointNames((prevNames) => ({
          ...prevNames,
          [newWaypoints.length - 1]: `Точка ${newWaypoints.length}`,
        }));
      }
      return newWaypoints;
    });
    dismissSearch();
  };

  const handleUserLocationChange = (e: UserLocationChangeEvent) => {
    const coord = e.nativeEvent.coordinate;
    if (!coord) return;
    if (!centeredToUser) {
      mapRef.current?.animateToRegion(
        {
          latitude: coord.latitude,
          longitude: coord.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
      setCenteredToUser(true);
    }
  };

  const totalKm = useMemo(() => {
    const pts =
      (roadRouting || riverRouting) && routePolyline
        ? routePolyline
        : waypoints;
    if (pts.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < pts.length; i++) sum += haversineKm(pts[i - 1], pts[i]);
    return sum;
  }, [waypoints, routePolyline, roadRouting, riverRouting]);

  const handleAnalyzePress = () => {
    if (
      ((roadRouting || riverRouting) && routePolyline?.length) ||
      waypoints.length >= 2
    ) {
      setAnalyzeOpen(true);
    }
  };

  const handleResetRoute = () => {
    setWaypoints([]);
    setWaypointNames({});
    setRoutePolyline(null);
    setRouteMode(false);
    setRoadRouting(false);
    setRiverRouting(false);
    setInfoOpen(false);
    clearCurrentRoute();
    clearAnalysisResult();
  };

  const confirmAnalyze = async () => {
    try {
      setAnalyzeLoading(true);
      setLoadingStep(0);
      setLoadingProgress(0);

      let basePoints =
        (roadRouting || riverRouting) && routePolyline
          ? routePolyline
          : waypoints;

      // Упрощаем маршрут, если точек слишком много (максимум 100 точек для ИИ)
      const originalPointCount = basePoints.length;
      basePoints = simplifyRoute(basePoints, 50, 0.05);
      if (basePoints.length < originalPointCount) {
        console.log(
          `[ANALYZE] Упрощен маршрут: ${originalPointCount} -> ${basePoints.length} точек`
        );
      }

      const pts = basePoints.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
      }));
      const coords = pts.map((p) => [p.lat, p.lng] as [number, number]);
      const lengthKm = totalKm;

      // Step 1: Получение данных о высотах (2-3 сек)
      setLoadingStep(0);
      setLoadingProgress(10);
      const elevations = await getElevationData(basePoints);
      let gain = 0;
      for (let i = 1; i < elevations.length; i++) {
        const delta = elevations[i] - elevations[i - 1];
        if (delta > 0) gain += delta;
      }

      // Step 2: Анализ географического контекста (1-2 сек)
      setLoadingStep(1);
      setLoadingProgress(30);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 3: Расчет геометрии маршрута (0.5 сек)
      setLoadingStep(2);
      setLoadingProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Анализ ИИ (3-6 сек)
      setLoadingStep(3);
      setLoadingProgress(70);

      // Загружаем настройки для передачи на бэкенд
      const { getSettings, clearSettingsCache } = await import(
        "../../../store/settingsStore"
      );
      // Сбрасываем кэш, чтобы получить актуальные настройки
      clearSettingsCache();
      const settings = getSettings();
      console.log("[Home ANALYZE] Используемые настройки:", settings);

      const body = {
        coordinates: coords,
        lengthKm,
        lengthMeters: Math.round(lengthKm * 1000),
        elevationGain: Math.round(gain),
        tourismType,
        startDate,
        endDate,
        elevationData: elevations,
        pointsPerDay: settings.pointsPerDay,
        usePointsSystem: settings.usePointsSystem,
        includeAIRecommendations: settings.includeAIRecommendations,
      };
      const url = getApiUrl(API_CONFIG.ENDPOINTS.ANALYZE_ROUTE);
      console.error("[ANALYZE] POST", url, "payload points:", pts.length, body);
      const result = await apiPost<any>(
        API_CONFIG.ENDPOINTS.ANALYZE_ROUTE,
        body
      );

      // Логирование для проверки данных от ИИ
      console.log("[Home ANALYZE] Response received:", {
        hasAnalysis: !!result.analysis,
        hasAnalysisStructured: !!result.analysisStructured,
        analysisStructuredKeys: result.analysisStructured
          ? Object.keys(result.analysisStructured)
          : null,
        summary: result.analysisStructured?.summary,
        stats: result.analysisStructured?.stats,
        geography: result.analysisStructured?.geography,
        days: result.analysisStructured?.days?.length || 0,
        recommendations:
          result.analysisStructured?.recommendations?.length || 0,
        warnings: result.analysisStructured?.warnings?.length || 0,
      });

      // Step 5: Формирование отчета (0.5 сек)
      setLoadingStep(4);
      setLoadingProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("[ANALYZE] OK", typeof result);
      setAnalysisResult(result);
      setAnalysisDone(true);
      setLoadingProgress(100);
      setAnalyzeLoading(false);
    } catch (e: any) {
      console.error("[ANALYZE] FAIL", e?.message || e);
      setAnalyzeLoading(false);
      setLoadingStep(0);
      setLoadingProgress(0);
      Alert.alert(
        "Ошибка",
        "Не удалось запустить анализ. Проверьте доступность бэкенда."
      );
    }
  };

  const goToResults = () => {
    setAnalyzeOpen(false);
    router.push("/(tabs)/explore");
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log("[DATE] Start date picker event:", event.type, selectedDate);

    // Закрываем picker на Android после выбора
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
    }

    // Обновляем дату если она была выбрана
    if (selectedDate) {
      setStartDateObj(selectedDate);
      setStartDate(selectedDate.toISOString().slice(0, 10));
      console.log(
        "[DATE] Start date updated to:",
        selectedDate.toISOString().slice(0, 10)
      );
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log("[DATE] End date picker event:", event.type, selectedDate);

    // Закрываем picker на Android после выбора
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
    }

    // Обновляем дату если она была выбрана
    if (selectedDate) {
      setEndDateObj(selectedDate);
      setEndDate(selectedDate.toISOString().slice(0, 10));
      console.log(
        "[DATE] End date updated to:",
        selectedDate.toISOString().slice(0, 10)
      );
    }
  };

  const [elevation, setElevation] = useState<number[]>([]);

  const elevationSummary = useMemo(() => {
    if (!elevation || elevation.length === 0) return null;
    const min = Math.min(...elevation);
    const max = Math.max(...elevation);
    let gain = 0;
    for (let i = 1; i < elevation.length; i++) {
      const delta = elevation[i] - elevation[i - 1];
      if (delta > 0) gain += delta;
    }
    return { min, max, gain: Math.round(gain), count: elevation.length };
  }, [elevation]);

  const info = useMemo(() => {
    const pts =
      (roadRouting || riverRouting) && routePolyline
        ? routePolyline
        : waypoints;
    if (pts.length < 2) return null;
    let minLat = Infinity,
      minLon = Infinity,
      maxLat = -Infinity,
      maxLon = -Infinity;
    pts.forEach((p) => {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLon) minLon = p.longitude;
      if (p.longitude > maxLon) maxLon = p.longitude;
    });
    return {
      points: pts,
      bbox: { minLat, minLon, maxLat, maxLon },
      lengthKm: totalKm,
    };
  }, [roadRouting, riverRouting, routePolyline, waypoints, totalKm]);

  const handleGetElevation = async (points: LatLng[]) => {
    const data = await getElevationData(points);
    console.log(data);

    setElevation(data);
  };

  // Функция для вычисления интервала отображения километража в зависимости от масштаба
  const getDistanceInterval = (longitudeDelta: number): number => {
    // Вычисляем примерную ширину видимой области в километрах
    // longitudeDelta в градусах, примерно 111 км на градус на экваторе
    const visibleWidthKm =
      longitudeDelta *
      111 *
      Math.cos(((mapRegion?.latitude || 55) * Math.PI) / 180);

    if (visibleWidthKm <= 5) return 0.5; // Каждые 0.5 км
    if (visibleWidthKm <= 20) return 1; // Каждые 1 км
    if (visibleWidthKm <= 50) return 5; // Каждые 5 км
    if (visibleWidthKm <= 100) return 10; // Каждые 10 км
    return 25; // Каждые 25 км
  };

  // Функция для вычисления точек с километражем на маршруте
  const getDistanceMarkers = useMemo(() => {
    if (!showDistanceMarkers) return [];

    const pts =
      (roadRouting || riverRouting) && routePolyline
        ? routePolyline
        : waypoints;
    if (pts.length < 2 || !mapRegion) return [];

    const interval = getDistanceInterval(mapRegion.longitudeDelta || 0.1);
    const markers: Array<{ coordinate: LatLng; distance: number }> = [];
    let accumulatedDistance = 0;

    // Добавляем маркер в начале маршрута (0 км)
    if (pts.length > 0) {
      markers.push({
        coordinate: pts[0],
        distance: 0,
      });
    }

    for (let i = 1; i < pts.length; i++) {
      const segmentDistance = haversineKm(pts[i - 1], pts[i]);
      const prevAccumulated = accumulatedDistance;
      accumulatedDistance += segmentDistance;

      // Проверяем, нужно ли добавить маркер в этом сегменте
      const prevMarker = Math.floor(prevAccumulated / interval);
      const currentMarker = Math.floor(accumulatedDistance / interval);

      if (currentMarker > prevMarker) {
        // Вычисляем позицию маркера на сегменте
        const targetDistance = currentMarker * interval;
        const distanceInSegment = targetDistance - prevAccumulated;
        const ratio = distanceInSegment / segmentDistance;

        markers.push({
          coordinate: {
            latitude:
              pts[i - 1].latitude +
              (pts[i].latitude - pts[i - 1].latitude) * ratio,
            longitude:
              pts[i - 1].longitude +
              (pts[i].longitude - pts[i - 1].longitude) * ratio,
          },
          distance: targetDistance,
        });
      }
    }

    // Добавляем маркер в конце маршрута
    if (pts.length > 1 && accumulatedDistance > 0) {
      const lastMarker = markers[markers.length - 1];
      // Добавляем только если последний маркер не совпадает с конечной точкой
      if (
        !lastMarker ||
        Math.abs(lastMarker.distance - accumulatedDistance) > 0.01
      ) {
        markers.push({
          coordinate: pts[pts.length - 1],
          distance: accumulatedDistance,
        });
      }
    }

    return markers;
  }, [
    waypoints,
    routePolyline,
    roadRouting,
    riverRouting,
    mapRegion,
    showDistanceMarkers,
  ]);

  const handleRegionChange = (region: any) => {
    setMapRegion(region);
  };

  useEffect(() => {
    if (info?.points?.length || (0 > 0 && info?.points)) {
      console.log("get");
      handleGetElevation(info?.points);
    }
  }, [info?.points.length]);

  // Загружаем настройку показа названий точек при фокусе экрана
  useFocusEffect(
    useCallback(() => {
      try {
        clearSettingsCache();
        const settings = getSettings();
        const showNames = (settings as any).showWaypointNames ?? false;
        console.log(
          "[WAYPOINT NAMES] Загрузка настройки при фокусе:",
          showNames,
          "settings:",
          settings
        );
        setShowWaypointNames(showNames);
      } catch (e) {
        console.error("[WAYPOINT NAMES] Ошибка загрузки настройки:", e);
      }
    }, [])
  );
  // И при первом монтировании
  useEffect(() => {
    try {
      clearSettingsCache();
      const settings = getSettings();
      const showNames = (settings as any).showWaypointNames ?? false;
      console.log(
        "[WAYPOINT NAMES] Загрузка настройки при монтировании:",
        showNames,
        "settings:",
        settings
      );
      setShowWaypointNames(showNames);
    } catch (e) {
      console.error("[WAYPOINT NAMES] Ошибка загрузки настройки:", e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <PlaceSearch
        ref={searchRef}
        visible={searchVisible}
        onSelect={onSelectPlace}
      />

      {!searchVisible && (
        <TouchableOpacity
          onPress={() => setSearchVisible(true)}
          activeOpacity={0.9}
          style={styles.searchToggleButton}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {info && info.points.length >= 2 && (
        <TouchableOpacity
          onPress={() => setInfoOpen(true)}
          activeOpacity={0.9}
          style={styles.infoButtonLeft}
        >
          <Text style={styles.infoButtonText}>ИИ</Text>
        </TouchableOpacity>
      )}

      {waypoints.length >= 2 && (
        <TouchableOpacity
          onPress={() => setRouteMenuOpen(true)}
          activeOpacity={0.9}
          style={styles.routeMenuButton}
        >
          <Ionicons name="list" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.menuContainer}>
        {menuOpen && (
          <BlurView intensity={40} tint="dark" style={styles.blurMenuContainer}>
            <View style={styles.routeControlsContainer}>
              <TouchableOpacity
                onPress={() => setRouteMode((v) => !v)}
                activeOpacity={0.9}
                style={[
                  styles.routeModeButton,
                  routeMode && styles.routeModeButtonActive,
                ]}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setRoadRouting((v) => {
                    if (v) return false;
                    setRiverRouting(false);
                    return true;
                  });
                }}
                activeOpacity={0.9}
                style={[
                  styles.roadRoutingButton,
                  roadRouting && styles.roadRoutingButtonActive,
                ]}
              >
                <Ionicons name="map" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setRiverRouting((v) => {
                    if (v) return false;
                    setRoadRouting(false);
                    return true;
                  });
                }}
                activeOpacity={0.9}
                style={[
                  styles.roadRoutingButton,
                  riverRouting && { backgroundColor: "#007AFF" },
                ]}
              >
                <Ionicons name="water" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowDistanceMarkers(!showDistanceMarkers);
                }}
                activeOpacity={0.9}
                style={[
                  styles.roadRoutingButton,
                  showDistanceMarkers && { backgroundColor: "#FF9500" },
                ]}
              >
                <Ionicons name="location" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetRoute}
                activeOpacity={0.9}
                style={[styles.roadRoutingButton, { backgroundColor: "#d00" }]}
              >
                <Ionicons name="trash" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.9}
          style={[
            styles.menuToggleButton,
            menuOpen && styles.menuToggleButtonActive,
          ]}
        >
          <Ionicons name={menuOpen ? "close" : "menu"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : (
        <MapView
          key={`map-${mapType}-${mapKey}`}
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
          onUserLocationChange={handleUserLocationChange}
          onPress={handleMapPress}
          onPanDrag={dismissSearch}
          onRegionChangeComplete={handleRegionChange}
          mapType={mapType === "apple" ? "standard" : "none"}
        >
          {mapType !== "apple" &&
            (() => {
              const urlTemplate = getTileUrlTemplate(mapType);
              console.log(
                "[MAP TYPE] Рендер карты, mapType:",
                mapType,
                "mapKey:",
                mapKey,
                "urlTemplate:",
                urlTemplate
              );
              if (!urlTemplate) {
                console.log("[MAP TYPE] URL шаблон пустой, не рендерим тайлы");
                return null;
              }
              console.log(
                "[MAP TYPE] Рендерим UrlTile с шаблоном:",
                urlTemplate
              );
              return (
                <UrlTile
                  urlTemplate={urlTemplate}
                  maximumZ={19}
                  minimumZ={0}
                  flipY={false}
                  zIndex={-1}
                />
              );
            })()}
          {/* Обычные маркеры точек (скрываем, если включено отображение названий) */}
          {!showWaypointNames &&
            waypoints.map((pt, idx) => (
              <Marker
                key={`${pt.latitude}-${pt.longitude}-${idx}`}
                coordinate={pt}
                title={waypointNames[idx] || `Точка ${idx + 1}`}
              />
            ))}
          {!roadRouting && !riverRouting && waypoints.length >= 2 && (
            <Polyline
              coordinates={waypoints}
              strokeColor="#007AFF"
              strokeWidth={4}
              tappable
              onPress={handleAnalyzePress}
            />
          )}
          {roadRouting && routePolyline && (
            <Polyline
              coordinates={routePolyline}
              strokeColor="#34C759"
              strokeWidth={5}
              tappable
              onPress={handleAnalyzePress}
            />
          )}
          {riverRouting && routePolyline && routePolyline.length > 0 && (
            <>
              {console.log("[RIVER] Отрисовка маршрута на карте:", {
                points: routePolyline.length,
                first: routePolyline[0],
                last: routePolyline[routePolyline.length - 1],
                riverRouting,
                hasRoutePolyline: !!routePolyline,
              })}
              <Polyline
                coordinates={routePolyline}
                strokeColor="#007AFF"
                strokeWidth={8}
                tappable
                onPress={handleAnalyzePress}
              />
              {/* Добавляем маркеры в начале и конце маршрута для визуальной проверки */}
              <Marker
                coordinate={routePolyline[0]}
                title="Начало маршрута по реке"
                pinColor="blue"
              />
              <Marker
                coordinate={routePolyline[routePolyline.length - 1]}
                title="Конец маршрута по реке"
                pinColor="blue"
              />
            </>
          )}
          {/* Маркеры с километражем */}
          {getDistanceMarkers.map((marker, idx) => (
            <Marker
              key={`distance-${idx}-${marker.distance}`}
              coordinate={marker.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.distanceMarkerContainer}>
                <Text style={styles.distanceMarkerText}>
                  {marker.distance < 1
                    ? `${(marker.distance * 1000).toFixed(0)} м`
                    : `${marker.distance.toFixed(1)} км`}
                </Text>
              </View>
            </Marker>
          ))}
          {/* Маркеры с названиями точек (всегда поверх) */}
          {showWaypointNames && waypoints.length > 0 && (
            <>
              {console.log(
                "[WAYPOINT NAMES] Рендерим маркеры названий, showWaypointNames:",
                showWaypointNames,
                "waypoints.length:",
                waypoints.length,
                "waypointNames:",
                waypointNames
              )}
              {waypoints.map((pt, idx) => {
                const name = waypointNames[idx] || `Точка ${idx + 1}`;
                console.log(
                  `[WAYPOINT NAMES] Маркер ${idx}: "${name}" на координатах:`,
                  pt
                );
                return (
                  <Marker
                    key={`wp-name-${idx}-${pt.latitude}-${pt.longitude}`}
                    coordinate={{
                      latitude: pt.latitude + 0.0001,
                      longitude: pt.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    zIndex={1000}
                  >
                    <View style={styles.distanceMarkerContainer}>
                      <Text style={styles.distanceMarkerText}>{name}</Text>
                    </View>
                  </Marker>
                );
              })}
            </>
          )}
        </MapView>
      )}

      {routingLoading && (roadRouting || riverRouting) && (
        <View style={styles.routingIndicatorContainer}>
          <ActivityIndicator color={riverRouting ? "#007AFF" : "#34C759"} />
        </View>
      )}

      {searchVisible && (
        <TouchableOpacity
          onPress={() => setSearchVisible(false)}
          activeOpacity={0.9}
          style={styles.searchToggleButton}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Модальное окно меню маршрута */}
      <Modal
        visible={routeMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRouteMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRouteMenuOpen(false)}
        >
          <Pressable
            style={styles.routeMenuModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.routeMenuHeader}>
              <Text style={styles.routeMenuTitle}>Точки маршрута</Text>
              <TouchableOpacity
                onPress={() => setRouteMenuOpen(false)}
                style={styles.routeMenuCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.routeMenuListWrapper}>
              <DraggableFlatList
                data={routeMenuData}
                removeClippedSubviews={false}
                onDragEnd={({ data }) => {
                  // Обновляем порядок точек и названий
                  const newWaypoints = data.map((item) => item.coordinate);
                  const newNames: Record<number, string> = {};
                  data.forEach((item, newIdx) => {
                    newNames[newIdx] = item.name;
                  });
                  setWaypoints(newWaypoints);
                  setWaypointNames(newNames);
                  // Сбрасываем маршрут, чтобы он пересчитался с новым порядком точек
                  setRoutePolyline(null);
                }}
                keyExtractor={(item) => item.id}
                renderItem={({
                  item,
                  drag,
                  isActive,
                }: RenderItemParams<(typeof routeMenuData)[0]>) => {
                  const idx = item.index;
                  return (
                    <View
                      style={[
                        styles.routeMenuItem,
                        isActive && styles.routeMenuItemActive,
                      ]}
                    >
                      <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={0}
                        disabled={isActive || editingWaypointIndex === idx}
                        style={styles.routeMenuItemDragHandle}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="reorder-three-outline"
                          size={24}
                          color="#666"
                        />
                      </TouchableOpacity>
                      <View style={styles.routeMenuItemContent}>
                        <View style={styles.routeMenuItemHeader}>
                          {editingWaypointIndex === idx ? (
                            <TextInput
                              style={styles.routeMenuItemInput}
                              value={editingWaypointName}
                              onChangeText={setEditingWaypointName}
                              placeholder={`Точка ${idx + 1}`}
                              autoFocus
                              onSubmitEditing={() => {
                                if (editingWaypointName.trim()) {
                                  setWaypointNames((prev) => ({
                                    ...prev,
                                    [idx]: editingWaypointName.trim(),
                                  }));
                                }
                                setEditingWaypointIndex(null);
                                setEditingWaypointName("");
                              }}
                              onBlur={() => {
                                if (editingWaypointName.trim()) {
                                  setWaypointNames((prev) => ({
                                    ...prev,
                                    [idx]: editingWaypointName.trim(),
                                  }));
                                }
                                setEditingWaypointIndex(null);
                                setEditingWaypointName("");
                              }}
                            />
                          ) : (
                            <Text style={styles.routeMenuItemName}>
                              {item.name}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.routeMenuItemCoords}>
                          {item.coordinate.latitude.toFixed(6)},{" "}
                          {item.coordinate.longitude.toFixed(6)}
                        </Text>
                      </View>
                      <View style={styles.routeMenuItemActions}>
                        {editingWaypointIndex !== idx && (
                          <>
                            <TouchableOpacity
                              onPress={() => {
                                setEditingWaypointIndex(idx);
                                setEditingWaypointName(item.name);
                              }}
                              style={styles.routeMenuActionButton}
                            >
                              <Ionicons
                                name="pencil"
                                size={18}
                                color="#007AFF"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                const newWaypoints = waypoints.filter(
                                  (_, i) => i !== idx
                                );
                                const newNames: Record<number, string> = {};
                                newWaypoints.forEach((_, i) => {
                                  if (i < idx) {
                                    newNames[i] =
                                      waypointNames[i] || `Точка ${i + 1}`;
                                  } else {
                                    // Сдвигаем индексы для точек после удаленной
                                    const oldName = waypointNames[i + 1];
                                    newNames[i] = oldName || `Точка ${i + 1}`;
                                  }
                                });
                                setWaypoints(newWaypoints);
                                setWaypointNames(newNames);
                              }}
                              style={styles.routeMenuActionButton}
                            >
                              <Ionicons name="trash" size={18} color="#d00" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={styles.routeMenuList}
                nestedScrollEnabled={true}
                scrollEnabled={true}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={analyzeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalyzeOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAnalyzeOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Анализ маршрута</Text>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Основная информация */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Информация о маршруте</Text>
                <Text style={{ color: "#666", marginBottom: 8 }}>
                  Точек:{" "}
                  {(roadRouting || riverRouting) && routePolyline
                    ? routePolyline.length
                    : waypoints.length}{" "}
                  • Длина: {totalKm.toFixed(2)} км
                  {(riverRouting && " • По реке") ||
                    (roadRouting && " • По дорогам") ||
                    ""}
                </Text>
              </View>

              {/* Тип туризма */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Тип маршрута</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ paddingHorizontal: 8 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        paddingVertical: 8,
                      }}
                    >
                      {(() => {
                        const availableTypes = allTourismTypes.filter((type) =>
                          isTourismTypeAvailable(type)
                        );
                        console.log(
                          `[TOURISM TYPE FILTER] Доступные типы: ${availableTypes.join(
                            ", "
                          )}, riverRouting=${riverRouting}, roadRouting=${roadRouting}`
                        );
                        return availableTypes.map((type) => {
                          const isSelected = tourismType === type;
                          return (
                            <TouchableOpacity
                              key={type}
                              onPress={() => {
                                // Дополнительная проверка на всякий случай
                                if (!isTourismTypeAvailable(type)) {
                                  console.log(
                                    `[TOURISM TYPE] Блокировка выбора недоступного типа: ${type}`
                                  );
                                  return;
                                }
                                setTourismType(type);
                              }}
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: isSelected
                                  ? "#007AFF"
                                  : "#f0f0f0",
                              }}
                            >
                              <Text
                                style={{
                                  color: isSelected ? "#fff" : "#333",
                                  fontSize: 14,
                                  fontWeight: "500",
                                }}
                              >
                                {type}
                              </Text>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Даты */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Даты похода</Text>

                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 12, color: "#666", marginBottom: 4 }}
                    >
                      Начало
                    </Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => {
                        console.log(
                          "[DATE] Opening start date picker, current date:",
                          startDate
                        );
                        setShowStartDatePicker(true);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: "#333" }}>
                        {startDate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 12, color: "#666", marginBottom: 4 }}
                    >
                      Конец
                    </Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => {
                        console.log(
                          "[DATE] Opening end date picker, current date:",
                          endDate
                        );
                        setShowEndDatePicker(true);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: "#333" }}>
                        {endDate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {(() => {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  const diffDays =
                    Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#007AFF",
                        marginTop: 8,
                        fontWeight: "600",
                      }}
                    >
                      📅 Продолжительность: {diffDays}{" "}
                      {diffDays === 1 ? "день" : diffDays < 5 ? "дня" : "дней"}
                    </Text>
                  );
                })()}
                <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  Нажмите для выбора даты
                </Text>
              </View>

              {/* Высоты */}
              {elevationSummary && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Данные о высотах</Text>
                  <View style={styles.elevationSummary}>
                    <Text style={styles.elevationText}>
                      Точек: {elevationSummary.count}
                    </Text>
                    <Text style={styles.elevationText}>
                      Мин: {elevationSummary.min} м
                    </Text>
                    <Text style={styles.elevationText}>
                      Макс: {elevationSummary.max} м
                    </Text>
                    <Text style={styles.elevationText}>
                      Набор высоты: {elevationSummary.gain} м
                    </Text>
                  </View>
                </View>
              )}

              {/* Progress bar during loading */}
              {analyzeLoading && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${loadingProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {loadingProgress}% • {loadingSteps[loadingStep]}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {!analysisDone ? (
                <>
                  <TouchableOpacity
                    onPress={() => setAnalyzeOpen(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={analyzeLoading}
                    onPress={confirmAnalyze}
                    style={[
                      styles.analyzePrimaryButton,
                      analyzeLoading && styles.analyzePrimaryButtonDisabled,
                    ]}
                  >
                    {analyzeLoading ? (
                      <>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.analyzePrimaryText}>
                          {loadingSteps[loadingStep]}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.analyzePrimaryText}>
                        Проанализировать
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setAnalyzeOpen(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Закрыть</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={goToResults}
                    style={styles.analyzePrimaryButton}
                  >
                    <Text style={styles.analyzePrimaryText}>
                      Смотреть результаты
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInfoOpen(false)}
        >
          <Pressable
            style={styles.infoModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.infoModalTitle}>Информация о маршруте</Text>
            {info && (
              <>
                <ScrollView
                  style={{ maxHeight: 400 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Основная информация */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>
                      📏 Основные параметры
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Длина маршрута:</Text>
                      <Text style={styles.infoValue}>
                        {info.lengthKm.toFixed(2)} км
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Количество точек:</Text>
                      <Text style={styles.infoValue}>{info.points.length}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Тип маршрута:</Text>
                      <Text style={styles.infoValue}>
                        {riverRouting
                          ? "По реке"
                          : roadRouting
                          ? "По дорогам"
                          : "Прямая линия"}
                      </Text>
                    </View>
                  </View>

                  {/* Географические границы */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>
                      🗺️ Географические границы
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Северная граница:</Text>
                      <Text style={styles.infoValue}>
                        {info.bbox.maxLat.toFixed(4)}°
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Южная граница:</Text>
                      <Text style={styles.infoValue}>
                        {info.bbox.minLat.toFixed(4)}°
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Западная граница:</Text>
                      <Text style={styles.infoValue}>
                        {info.bbox.minLon.toFixed(4)}°
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Восточная граница:</Text>
                      <Text style={styles.infoValue}>
                        {info.bbox.maxLon.toFixed(4)}°
                      </Text>
                    </View>
                  </View>

                  {/* Координаты (скрытые по умолчанию) */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>
                      📍 Координаты точек
                    </Text>
                    <TouchableOpacity
                      style={styles.coordinatesToggle}
                      onPress={() => setShowCoordinates(!showCoordinates)}
                    >
                      <Text style={styles.coordinatesToggleText}>
                        {showCoordinates
                          ? "Скрыть координаты"
                          : "Показать координаты"}
                      </Text>
                      <Ionicons
                        name={showCoordinates ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#007AFF"
                      />
                    </TouchableOpacity>
                    {showCoordinates && (
                      <View style={styles.coordinatesList}>
                        {info.points.map((p, i) => (
                          <Text
                            key={`${p.latitude}-${p.longitude}-${i}`}
                            style={styles.coordinateItem}
                          >
                            {i + 1}. {p.latitude.toFixed(6)},{" "}
                            {p.longitude.toFixed(6)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text
                    style={{
                      marginTop: 16,
                      color: "#666",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    Регионы, высоты и детальный анализ будут получены при
                    запуске ИИ-анализа
                  </Text>
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      // Save current route and navigate to Explore
                      if (info) {
                        setCurrentRoute({
                          points: info.points,
                          roadRouting,
                          riverRouting,
                          lengthKm: info.lengthKm,
                        });
                      }
                      router.push("/(tabs)/explore");
                    }}
                    style={styles.analyzePrimaryButton}
                  >
                    <Text style={styles.analyzePrimaryText}>Анализ ИИ</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Pickers - Поверх основного модала */}
      {showStartDatePicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showStartDatePicker}
          onRequestClose={() => setShowStartDatePicker(false)}
          statusBarTranslucent
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.8)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 24,
                margin: 20,
                minWidth: 320,
                maxWidth: "90%",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  marginBottom: 20,
                  textAlign: "center",
                  color: "#333",
                }}
              >
                Выберите дату начала
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Платформа: {Platform.OS} | Текущая дата: {startDate}
              </Text>

              <View
                style={{
                  alignItems: "center",
                  marginBottom: 20,
                  minHeight: 100,
                  justifyContent: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <DateTimePicker
                  value={startDateObj}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {Platform.OS === "android"
                    ? "Выберите дату выше и нажмите 'Готово'"
                    : "Поворачивайте колесики для выбора даты"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log("[DATE] Start date picker cancelled");
                    setShowStartDatePicker(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e1e5e9",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#666", fontSize: 16, fontWeight: "500" }}
                  >
                    Отмена
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    console.log(
                      "[DATE] Start date picker confirmed, date:",
                      startDateObj
                    );
                    setStartDate(startDateObj.toISOString().slice(0, 10));
                    setShowStartDatePicker(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    backgroundColor: "#007AFF",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Готово
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showEndDatePicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showEndDatePicker}
          onRequestClose={() => setShowEndDatePicker(false)}
          statusBarTranslucent
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.8)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 24,
                margin: 20,
                minWidth: 320,
                maxWidth: "90%",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  marginBottom: 20,
                  textAlign: "center",
                  color: "#333",
                }}
              >
                Выберите дату окончания
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Платформа: {Platform.OS} | Текущая дата: {endDate}
              </Text>

              <View
                style={{
                  alignItems: "center",
                  marginBottom: 20,
                  minHeight: 100,
                  justifyContent: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <DateTimePicker
                  value={endDateObj}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleEndDateChange}
                  minimumDate={startDateObj}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {Platform.OS === "android"
                    ? "Выберите дату выше и нажмите 'Готово'"
                    : "Поворачивайте колесики для выбора даты"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log("[DATE] End date picker cancelled");
                    setShowEndDatePicker(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e1e5e9",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#666", fontSize: 16, fontWeight: "500" }}
                  >
                    Отмена
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    console.log(
                      "[DATE] End date picker confirmed, date:",
                      endDateObj
                    );
                    setEndDate(endDateObj.toISOString().slice(0, 10));
                    setShowEndDatePicker(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    backgroundColor: "#007AFF",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Готово
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
