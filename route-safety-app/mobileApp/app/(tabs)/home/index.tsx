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
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, {
  Marker,
  Polyline,
  LatLng,
  MapPressEvent,
  UserLocationChangeEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import PlaceSearch, {
  PlaceResult,
  PlaceSearchHandle,
} from "../../../components/PlaceSearch";
import { styles } from "./styles";
import { Ionicons } from "@expo/vector-icons";
import { apiPost, API_CONFIG, getApiUrl } from "../../../config/api";
import { router } from "expo-router";
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

// Функция для построения маршрута по реке через водные пути OSM
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
    // Используем Overpass API для получения водных путей (waterways) из OSM
    // Строим маршрут по ближайшим водным путям между точками
    const route: LatLng[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      console.log(
        `[RIVER] Обрабатываем сегмент ${i + 1}/${
          points.length - 1
        }: [${start.latitude.toFixed(4)}, ${start.longitude.toFixed(
          4
        )}] -> [${end.latitude.toFixed(4)}, ${end.longitude.toFixed(4)}]`
      );

      // Получаем водные пути в расширенной области между точками
      // Уменьшаем область поиска для более точного поиска
      const distance = haversineKm(start, end);
      // Используем меньшее расширение - максимум 0.02 градуса (примерно 2 км)
      const expandFactor = Math.min(0.02, Math.max(0.005, distance * 0.005));
      const bbox = [
        Math.min(start.longitude, end.longitude) - expandFactor,
        Math.min(start.latitude, end.latitude) - expandFactor,
        Math.max(start.longitude, end.longitude) + expandFactor,
        Math.max(start.latitude, end.latitude) + expandFactor,
      ].join(",");

      console.log(
        `[RIVER] Расстояние между точками: ${distance.toFixed(
          2
        )} км, расширение области: ${expandFactor.toFixed(4)} градуса (≈${(
          expandFactor * 111
        ).toFixed(1)} км)`
      );

      // Overpass API запрос для получения водных путей (rivers, streams, canals)
      const overpassQuery = `[out:json][timeout:30];
(
  way["waterway"~"^(river|stream|canal|ditch|drain)$"]["waterway"!="dam"]["waterway"!="weir"](bbox:${bbox});
);
out geom;`;

      const MAX_DISTANCE_TO_WATERWAY = 5.0; // Максимальное расстояние до водного пути в км (увеличено для лучшего поиска)

      let foundWaterway = false;
      let overpassData: any = null;

      // Пробуем несколько Overpass API серверов
      const overpassServers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
      ];

      let lastError: any = null;

      for (const server of overpassServers) {
        try {
          console.log(
            `[RIVER] Запрос к Overpass API (${server}) для сегмента ${
              i + 1
            }, bbox: ${bbox}`
          );
          const overpassResponse = await fetch(server, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(overpassQuery)}`,
          });

          if (overpassResponse.ok) {
            overpassData = await overpassResponse.json();
            console.log(`[RIVER] Успешный ответ от ${server}`);
            break;
          } else {
            console.log(
              `[RIVER] ${server} вернул ошибку для сегмента ${i + 1}, статус: ${
                overpassResponse.status
              }`
            );
            lastError = { status: overpassResponse.status, server };
          }
        } catch (error) {
          console.log(`[RIVER] Ошибка при запросе к ${server}:`, error);
          lastError = error;
        }
      }

      if (overpassData) {
        const waterways = overpassData.elements || [];
        console.log(
          `[RIVER] Найдено водных путей в области: ${waterways.length}`
        );

        if (waterways.length > 0) {
          // Сначала фильтруем водные пути, которые находятся слишком далеко
          // Это предотвращает обработку водных путей, которые находятся на расстоянии тысяч километров
          const filteredWaterways = waterways.filter((way: any) => {
            if (!way.geometry || way.geometry.length < 2) return false;

            // Проверяем, есть ли хотя бы одна точка водного пути в разумной близости к нашим точкам
            let hasNearbyPoint = false;
            for (const geom of way.geometry) {
              const distToStart = haversineKm(start, {
                latitude: geom.lat,
                longitude: geom.lon,
              });
              const distToEnd = haversineKm(end, {
                latitude: geom.lat,
                longitude: geom.lon,
              });

              // Если хотя бы одна точка водного пути близко к нашим точкам (в пределах 20 км), включаем его
              if (distToStart <= 20 || distToEnd <= 20) {
                hasNearbyPoint = true;
                break;
              }
            }
            return hasNearbyPoint;
          });

          console.log(
            `[RIVER] После предварительной фильтрации осталось ${filteredWaterways.length} из ${waterways.length} водных путей`
          );

          // Находим водный путь, который ближе всего к обеим точкам
          // Используем более гибкую логику: ищем водный путь с минимальной суммой расстояний
          let bestWay: any = null;
          let bestStartIdx = -1;
          let bestEndIdx = -1;
          let minTotalDist = Infinity;

          for (const way of filteredWaterways) {
            if (way.geometry && way.geometry.length > 1) {
              // Находим ближайшие точки на водном пути к начальной и конечной точкам
              let closestStartIdx = -1;
              let closestEndIdx = -1;
              let minStartDist = Infinity;
              let minEndDist = Infinity;

              for (let j = 0; j < way.geometry.length; j++) {
                const geom = way.geometry[j];
                const distToStart = haversineKm(start, {
                  latitude: geom.lat,
                  longitude: geom.lon,
                });
                const distToEnd = haversineKm(end, {
                  latitude: geom.lat,
                  longitude: geom.lon,
                });

                if (distToStart < minStartDist) {
                  minStartDist = distToStart;
                  closestStartIdx = j;
                }
                if (distToEnd < minEndDist) {
                  minEndDist = distToEnd;
                  closestEndIdx = j;
                }
              }

              // Вычисляем общее расстояние
              const totalDist = minStartDist + minEndDist;
              const maxDist = Math.max(minStartDist, minEndDist);

              // Выбираем водный путь, который:
              // 1. Ближе всего к обеим точкам (минимальная сумма расстояний)
              // 2. И хотя бы одна точка близко (в пределах MAX_DISTANCE_TO_WATERWAY)
              // 3. И максимальное расстояние не слишком большое (не более 2x MAX_DISTANCE_TO_WATERWAY)
              // 4. И индексы разные (иначе маршрут не будет построен)
              if (
                (minStartDist <= MAX_DISTANCE_TO_WATERWAY ||
                  minEndDist <= MAX_DISTANCE_TO_WATERWAY) &&
                maxDist <= MAX_DISTANCE_TO_WATERWAY * 2 &&
                closestStartIdx !== closestEndIdx // Критично: индексы должны быть разные!
              ) {
                // Выбираем водный путь, который ближе всего к обеим точкам
                if (totalDist < minTotalDist) {
                  minTotalDist = totalDist;
                  bestWay = way;
                  bestStartIdx = closestStartIdx;
                  bestEndIdx = closestEndIdx;
                }
              }
            }
          }

          // Если не нашли в пределах ограничений, попробуем найти самый близкий (но не слишком далеко)
          if (!bestWay) {
            const MAX_FALLBACK_DISTANCE = 50.0; // Максимальное расстояние для fallback поиска
            console.log(
              `[RIVER] Не найдено водных путей в пределах ${MAX_DISTANCE_TO_WATERWAY} км, ищем ближайший (макс. ${MAX_FALLBACK_DISTANCE} км)...`
            );
            minTotalDist = Infinity;

            // Используем уже отфильтрованные водные пути для fallback поиска
            for (const way of filteredWaterways) {
              if (way.geometry && way.geometry.length > 1) {
                let closestStartIdx = -1;
                let closestEndIdx = -1;
                let minStartDist = Infinity;
                let minEndDist = Infinity;

                for (let j = 0; j < way.geometry.length; j++) {
                  const geom = way.geometry[j];
                  const distToStart = haversineKm(start, {
                    latitude: geom.lat,
                    longitude: geom.lon,
                  });
                  const distToEnd = haversineKm(end, {
                    latitude: geom.lat,
                    longitude: geom.lon,
                  });

                  if (distToStart < minStartDist) {
                    minStartDist = distToStart;
                    closestStartIdx = j;
                  }
                  if (distToEnd < minEndDist) {
                    minEndDist = distToEnd;
                    closestEndIdx = j;
                  }
                }

                // Проверяем, что водный путь не слишком далеко и индексы разные
                const maxDist = Math.max(minStartDist, minEndDist);
                if (
                  maxDist <= MAX_FALLBACK_DISTANCE &&
                  closestStartIdx !== closestEndIdx
                ) {
                  const totalDist = minStartDist + minEndDist;
                  if (totalDist < minTotalDist) {
                    minTotalDist = totalDist;
                    bestWay = way;
                    bestStartIdx = closestStartIdx;
                    bestEndIdx = closestEndIdx;
                  }
                }
              }
            }

            if (bestWay) {
              const foundStartDist = haversineKm(start, {
                latitude: bestWay.geometry[bestStartIdx].lat,
                longitude: bestWay.geometry[bestStartIdx].lon,
              });
              const foundEndDist = haversineKm(end, {
                latitude: bestWay.geometry[bestEndIdx].lat,
                longitude: bestWay.geometry[bestEndIdx].lon,
              });
              console.log(
                `[RIVER] Найден ближайший водный путь: расстояние до начала: ${foundStartDist.toFixed(
                  2
                )} км, до конца: ${foundEndDist.toFixed(
                  2
                )} км, индексы: ${bestStartIdx} -> ${bestEndIdx}`
              );
            } else {
              console.log(
                `[RIVER] Не найдено подходящих водных путей даже в пределах ${MAX_FALLBACK_DISTANCE} км`
              );
            }
          }

          // Если нашли подходящий водный путь, строим маршрут строго по его геометрии
          // Важно: индексы должны быть разные, иначе маршрут не будет построен
          if (
            bestWay &&
            bestWay.geometry &&
            bestWay.geometry.length > 1 &&
            bestStartIdx >= 0 &&
            bestEndIdx >= 0 &&
            bestStartIdx !== bestEndIdx // Критично: индексы должны быть разные!
          ) {
            // Вычисляем расстояния для лога
            const logStartDist = haversineKm(start, {
              latitude: bestWay.geometry[bestStartIdx].lat,
              longitude: bestWay.geometry[bestStartIdx].lon,
            });
            const logEndDist = haversineKm(end, {
              latitude: bestWay.geometry[bestEndIdx].lat,
              longitude: bestWay.geometry[bestEndIdx].lon,
            });
            console.log(
              `[RIVER] Используем водный путь с ${
                bestWay.geometry.length
              } точками, индексы: ${bestStartIdx} -> ${bestEndIdx}, расстояние до начала: ${logStartDist.toFixed(
                2
              )} км, до конца: ${logEndDist.toFixed(2)} км`
            );

            // Добавляем начальную точку, если она не на водном пути
            const startOnWaterway =
              haversineKm(start, {
                latitude: bestWay.geometry[bestStartIdx].lat,
                longitude: bestWay.geometry[bestStartIdx].lon,
              }) < 0.1;

            if (!startOnWaterway) {
              route.push(start);
            }

            // Добавляем точки водного пути между начальной и конечной точками
            // Определяем правильное направление движения по водному пути
            if (bestStartIdx < bestEndIdx) {
              // Идем от startIdx к endIdx
              for (let j = bestStartIdx; j <= bestEndIdx; j++) {
                const geom = bestWay.geometry[j];
                route.push({
                  latitude: geom.lat,
                  longitude: geom.lon,
                });
              }
            } else {
              // Идем от startIdx к endIdx в обратном направлении
              for (let j = bestStartIdx; j >= bestEndIdx; j--) {
                const geom = bestWay.geometry[j];
                route.push({
                  latitude: geom.lat,
                  longitude: geom.lon,
                });
              }
            }

            // Добавляем конечную точку, если она не на водном пути
            const endOnWaterway =
              haversineKm(end, {
                latitude: bestWay.geometry[bestEndIdx].lat,
                longitude: bestWay.geometry[bestEndIdx].lon,
              }) < 0.1;

            if (!endOnWaterway) {
              route.push(end);
            }

            console.log(
              `[RIVER] Добавлено точек из водного пути для сегмента ${
                i + 1
              } (всего в маршруте: ${route.length})`
            );
            foundWaterway = true;
          } else {
            // Логируем информацию о найденных водных путях для отладки
            if (waterways.length > 0) {
              console.log(
                `[RIVER] Найдено ${
                  waterways.length
                } водных путей, но ни один не подходит для сегмента ${
                  i + 1
                } (требуется расстояние <= ${MAX_DISTANCE_TO_WATERWAY} км от обеих точек)`
              );
              // Показываем расстояния до ближайших водных путей
              for (let w = 0; w < Math.min(3, waterways.length); w++) {
                const way = waterways[w];
                if (way.geometry && way.geometry.length > 0) {
                  let minStartDist = Infinity;
                  let minEndDist = Infinity;
                  for (const geom of way.geometry) {
                    const distToStart = haversineKm(start, {
                      latitude: geom.lat,
                      longitude: geom.lon,
                    });
                    const distToEnd = haversineKm(end, {
                      latitude: geom.lat,
                      longitude: geom.lon,
                    });
                    if (distToStart < minStartDist) minStartDist = distToStart;
                    if (distToEnd < minEndDist) minEndDist = distToEnd;
                  }
                  console.log(
                    `[RIVER] Водный путь ${
                      w + 1
                    }: расстояние до начала: ${minStartDist.toFixed(
                      2
                    )} км, до конца: ${minEndDist.toFixed(2)} км`
                  );
                }
              }
            } else {
              console.log(
                `[RIVER] Не найден подходящий водный путь для сегмента ${
                  i + 1
                } (требуется расстояние <= ${MAX_DISTANCE_TO_WATERWAY} км)`
              );
            }
          }
        } else {
          console.log(
            `[RIVER] Водные пути не найдены в области для сегмента ${i + 1}`
          );
        }
      } else {
        console.log(
          `[RIVER] Не удалось получить данные от Overpass API для сегмента ${
            i + 1
          }`
        );
        if (lastError) {
          console.log("[RIVER] Последняя ошибка:", lastError);
        }
      }

      // Если не нашли водный путь для этого сегмента, возвращаем null
      if (!foundWaterway) {
        console.log(
          `[RIVER] Не удалось найти водный путь для сегмента ${
            i + 1
          }, маршрут не может быть построен`
        );
        return null;
      }
    }

    console.log(`[RIVER] Маршрут построен: ${route.length} точек`);
    return route.length > 0 ? route : null;
  } catch (error) {
    console.error("[RIVER] Error building river route:", error);
    return null;
  }
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [routePolyline, setRoutePolyline] = useState<LatLng[] | null>(null);
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

  // Получаем настройку отображения километража из store
  const [showDistanceMarkers, setShowDistanceMarkers] = useState(false);

  // Синхронизируем состояние с настройками из store при монтировании и при фокусе экрана
  useEffect(() => {
    const settings = getSettings();
    setShowDistanceMarkers(settings.showDistanceOnRoute ?? false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Синхронизируем настройки при возврате на экран
      clearSettingsCache();
      const settings = getSettings();
      setShowDistanceMarkers(settings.showDistanceOnRoute ?? false);
    }, [])
  );

  const tourismTypes = [
    "пеший",
    "велосипедный",
    "водный",
    "автомобильный",
    "воздушный",
    "мото",
  ];

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
    setWaypoints((prev) => (routeMode ? [...prev, coordinate] : [coordinate]));
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

      const basePoints =
        (roadRouting || riverRouting) && routePolyline
          ? routePolyline
          : waypoints;
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

    if (visibleWidthKm <= 10) return 1; // Каждые 1 км
    if (visibleWidthKm <= 50) return 10; // Каждые 10 км
    if (visibleWidthKm <= 100) return 50; // Каждые 50 км
    return 100; // Каждые 100 км
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
          <Ionicons name="navigate" size={18} color="#fff" />
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
          onPress={async () => {
            const newValue = !showDistanceMarkers;
            setShowDistanceMarkers(newValue);
            // Обновляем настройку в store
            const currentSettings = getSettings();
            const updatedSettings = {
              ...currentSettings,
              showDistanceOnRoute: newValue,
            };
            await saveSettings(updatedSettings);
            clearSettingsCache();
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

      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
          onUserLocationChange={handleUserLocationChange}
          onPress={handleMapPress}
          onPanDrag={dismissSearch}
          onRegionChangeComplete={handleRegionChange}
        >
          {waypoints.map((pt, idx) => (
            <Marker
              key={`${pt.latitude}-${pt.longitude}-${idx}`}
              coordinate={pt}
              title={`Точка ${idx + 1}`}
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
                  {marker.distance.toFixed(0)} км
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {routingLoading && (roadRouting || riverRouting) && (
        <View style={styles.routingIndicatorContainer}>
          <ActivityIndicator color={riverRouting ? "#007AFF" : "#34C759"} />
        </View>
      )}

      {info && info.points.length >= 2 && (
        <TouchableOpacity
          onPress={() => setInfoOpen(true)}
          activeOpacity={0.9}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle" size={22} color="#fff" />
        </TouchableOpacity>
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
                <Text style={styles.formLabel}>Тип туризма</Text>
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
                      {tourismTypes.map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setTourismType(type)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor:
                              tourismType === type ? "#007AFF" : "#f0f0f0",
                          }}
                        >
                          <Text
                            style={{
                              color: tourismType === type ? "#fff" : "#333",
                              fontSize: 14,
                              fontWeight: "500",
                            }}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
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
