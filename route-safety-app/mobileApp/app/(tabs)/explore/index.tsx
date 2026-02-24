import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import {
  getAnalysisResult,
  setAnalysisResult,
} from "../../../store/analysisStore";
import { getCurrentRoute } from "../../../store/routeStore";
import { clearCurrentRoute } from "../../../store/routeStore";
import { clearAnalysisResult } from "../../../store/analysisStore";
import { styles } from "./styles";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState, useEffect } from "react";
import { API_CONFIG, getApiUrl, apiPost } from "../../../config/api";
import { getElevationData } from "../home/helpers";
import { saveRoute, saveRouteAnalysis } from "../../../services/routeService";
import { isAuthenticated } from "../../../services/authService";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Функция для получения эмодзи по условиям погоды
function getWeatherEmoji(conditions: string): string {
  const cond = conditions.toLowerCase();
  if (cond.includes("ясно") || cond.includes("солнечно")) return "☀️";
  if (cond.includes("в основном ясно")) return "🌤️";
  if (cond.includes("частично облачно")) return "⛅";
  if (cond.includes("пасмурно") || cond.includes("облачно")) return "☁️";
  if (cond.includes("туман") || cond.includes("изморозь")) return "🌫️";
  if (cond.includes("морось")) return "🌦️";
  if (cond.includes("дождь") || cond.includes("ливень")) return "🌧️";
  if (cond.includes("снег")) return "❄️";
  if (cond.includes("гроза")) return "⛈️";
  if (cond.includes("град")) return "🌨️";
  return "🌤️";
}

// Функция для получения эмодзи ветра по скорости
function getWindEmoji(windSpeed: number): string {
  if (windSpeed >= 15) return "💨"; // Сильный ветер
  if (windSpeed >= 10) return "🌬️"; // Умеренный ветер
  return "🍃"; // Легкий ветер
}

// Функция для получения эмодзи осадков
function getPrecipitationEmoji(precipitation: number): string {
  if (precipitation >= 10) return "🌧️"; // Сильные осадки
  if (precipitation >= 5) return "🌦️"; // Умеренные осадки
  if (precipitation > 0) return "💧"; // Легкие осадки
  return "☀️"; // Без осадков
}

// Функция для получения цвета фона по температуре
function getTemperatureColor(min: number, max: number): string {
  const avg = (min + max) / 2;
  if (avg >= 25) return "#FF6B6B"; // Жарко - красный
  if (avg >= 15) return "#4ECDC4"; // Тепло - бирюзовый
  if (avg >= 5) return "#95E1D3"; // Прохладно - светло-бирюзовый
  if (avg >= -5) return "#A8E6CF"; // Холодно - светло-зеленый
  return "#B8D4F0"; // Очень холодно - светло-голубой
}

export default function ExploreScreen() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const existing = getAnalysisResult();
  const route = getCurrentRoute();
  const [saveRouteModalVisible, setSaveRouteModalVisible] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);

  const [tourismType, setTourismType] = useState("пеший");
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Single picker control
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(
    null
  );

  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const loadingSteps = [
    "Получение данных о высотах...",
    "Анализ географического контекста...",
    "Расчет геометрии маршрута...",
    "Анализ ИИ в процессе...",
    "Формирование отчета...",
  ];

  const elevationSummary = useMemo(() => {
    if (!route?.points || route.points.length === 0) return null;
    return null;
  }, [route?.points]);

  const handleStartDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      // On Android inline control is a dialog; we keep our modal consistent
    }
    if (selectedDate) {
      setStartDateObj(selectedDate);
    }
  };

  const handleEndDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      // keep modal open until explicit actions
    }
    if (selectedDate) {
      setEndDateObj(selectedDate);
    }
  };

  const tourismTypes = ["пеший", "водный", "автомобильный"];

  // Функция для проверки, доступен ли тип туризма
  const isTourismTypeAvailable = (type: string): boolean => {
    if (type === "водный") {
      // Водный доступен только если выбран водный маршрут
      return route?.riverRouting ?? false;
    }
    if (type === "автомобильный") {
      // Автомобильный доступен только если построена дорога
      return route?.roadRouting ?? false;
    }
    return true; // Пеший всегда доступен
  };

  // Автоматически устанавливаем тип туризма при изменении режима маршрута
  useEffect(() => {
    if (!route) return;

    const currentAvailable = isTourismTypeAvailable(tourismType);

    if (!currentAvailable) {
      console.log(
        `[EXPLORE TOURISM TYPE FIX] Текущий тип "${tourismType}" недоступен, переключаем на "пеший"`
      );
      setTourismType("пеший");
      return;
    }

    if (route.riverRouting) {
      // Если выбран водный маршрут, автоматически устанавливаем водный тип
      if (tourismType !== "водный") {
        console.log(
          `[EXPLORE TOURISM TYPE] Автоматически переключаем на "водный" (riverRouting=true)`
        );
        setTourismType("водный");
      }
    } else if (route.roadRouting && tourismType === "водный") {
      // Если водный маршрут не выбран, но выбран водный тип, переключаем на пеший
      console.log(
        `[EXPLORE TOURISM TYPE] Переключаем с "водный" на "пеший" (riverRouting=false)`
      );
      setTourismType("пеший");
    } else if (!route.roadRouting && tourismType === "автомобильный") {
      // Если дорога не построена, но выбран автомобильный тип, переключаем на пеший
      console.log(
        `[EXPLORE TOURISM TYPE] Переключаем с "автомобильный" на "пеший" (roadRouting=false)`
      );
      setTourismType("пеший");
    }
  }, [route?.riverRouting, route?.roadRouting]);

  const runAnalyze = async () => {
    try {
      if (!route || route.points.length < 2) {
        Alert.alert("Нет маршрута", "Постройте маршрут на вкладке Главная.");
        return;
      }
      setAnalyzeLoading(true);
      setLoadingStep(0);
      setLoadingProgress(10);

      const elevations = await getElevationData(route.points);
      let gain = 0;
      for (let i = 1; i < elevations.length; i++) {
        const delta = elevations[i] - elevations[i - 1];
        if (delta > 0) gain += delta;
      }

      setLoadingStep(1);
      setLoadingProgress(30);
      await new Promise((r) => setTimeout(r, 1200));

      setLoadingStep(2);
      setLoadingProgress(50);
      await new Promise((r) => setTimeout(r, 400));

      setLoadingStep(3);
      setLoadingProgress(70);

      const coords = route.points.map(
        (p) => [p.latitude, p.longitude] as [number, number]
      );
      const lengthKm = route.lengthKm;

      // Загружаем настройки для передачи на бэкенд
      const { getSettings, clearSettingsCache } = await import(
        "../../../store/settingsStore"
      );
      // Сбрасываем кэш, чтобы получить актуальные настройки
      clearSettingsCache();
      const settings = getSettings();
      console.log("[Explore ANALYZE] Используемые настройки:", settings);

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
      console.log(
        "[Explore ANALYZE] POST",
        url,
        "payload points:",
        coords.length,
        "tourismType:",
        tourismType
      );
      console.log("[Explore ANALYZE] Body:", {
        ...body,
        coordinates: `[${coords.length} points]`,
        elevationData: `[${elevations.length} values]`,
      });
      let result;
      try {
        result = await apiPost<any>(
          API_CONFIG.ENDPOINTS.ANALYZE_ROUTE,
          body
        );
      } catch (error: any) {
        console.error("[Explore ANALYZE] Full error:", error);
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes("401")) {
          Alert.alert(
            "Ошибка авторизации",
            "Проверьте подключение к серверу. Если проблема сохраняется, попробуйте перезапустить приложение."
          );
        } else {
          Alert.alert(
            "Ошибка",
            errorMessage || "Не удалось запустить анализ. Проверьте доступность бэкенда."
          );
        }
        throw error;
      }

      // Логирование для проверки данных от ИИ
      console.log("[Explore ANALYZE] Response received:", {
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
        dailyRoutes: result.dailyRoutes?.length || 0,
        dailyRoutesWeather:
          result.dailyRoutes?.map((d: any) => ({
            day: d.day,
            date: d.date,
            weather: d.weather,
          })) || [],
      });

      setLoadingStep(4);
      setLoadingProgress(90);
      await new Promise((r) => setTimeout(r, 500));

      setAnalysisResult(result);
      setLoadingProgress(100);
      setAnalyzeLoading(false);
    } catch (e: any) {
      console.error("[Explore ANALYZE] FAIL", e?.message || e);
      setAnalyzeLoading(false);
      setLoadingStep(0);
      setLoadingProgress(0);
      Alert.alert(
        "Ошибка",
        "Не удалось запустить анализ. Проверьте доступность бэкенда."
      );
    }
  };

  const handleSaveRoute = async () => {
    if (!route || !existing) {
      Alert.alert("Ошибка", "Нет маршрута или анализа для сохранения");
      return;
    }

    if (!routeName.trim()) {
      Alert.alert("Ошибка", "Введите название маршрута");
      return;
    }

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      Alert.alert(
        "Ошибка",
        "Необходимо войти в систему для сохранения маршрута"
      );
      router.push("/(tabs)/profile");
      return;
    }

    setSavingRoute(true);
    try {
      // Сохраняем маршрут
      const savedRoute = await saveRoute({
        name: routeName.trim(),
        description: routeDescription.trim() || undefined,
        coordinates: route.points,
        waypointNames: {},
        roadRouting: route.roadRouting,
        riverRouting: route.riverRouting,
        lengthKm: route.lengthKm,
      });

      // Сохраняем анализ, если он есть
      if (existing) {
      console.log("[Explore SAVE] Existing analysis structure:", {
        hasAnalysis: !!existing.analysis,
        analysisType: typeof existing.analysis,
        analysisValue: typeof existing.analysis === 'string' ? existing.analysis.substring(0, 50) + '...' : existing.analysis,
        hasStats: !!existing.stats,
        statsType: typeof existing.stats,
        statsKeys: existing.stats ? Object.keys(existing.stats) : null,
        hasTerrainType: !!existing.terrainType,
        terrainTypeValue: existing.terrainType,
        hasGeographicContext: !!existing.geographicContext,
        geographicContextType: typeof existing.geographicContext,
        geographicContextKeys: existing.geographicContext ? Object.keys(existing.geographicContext) : null,
        hasFormattedGeoContext: !!existing.formattedGeoContext,
        formattedGeoContextType: typeof existing.formattedGeoContext,
        formattedGeoContextValue: typeof existing.formattedGeoContext === 'string' ? existing.formattedGeoContext.substring(0, 100) : existing.formattedGeoContext,
        hasDailyRoutes: !!existing.dailyRoutes,
        dailyRoutesLength: existing.dailyRoutes?.length || 0,
        hasTotalDays: typeof existing.totalDays === 'number',
        totalDaysValue: existing.totalDays,
        allKeys: Object.keys(existing),
      });

        // Убеждаемся, что анализ содержит все необходимые поля
        let analysisText = existing.analysis;
        if (!analysisText || typeof analysisText !== 'string' || analysisText.trim().length === 0) {
          // Если analysis не строка или пустой, пытаемся преобразовать
          if (existing.analysisStructured) {
            analysisText = JSON.stringify(existing.analysisStructured, null, 2);
          } else if (typeof existing.analysis === 'object' && existing.analysis !== null) {
            analysisText = JSON.stringify(existing.analysis, null, 2);
          } else {
            // Если ничего не помогло, создаем базовое описание
            analysisText = existing.analysisStructured?.summary?.difficultyReasoning || 
                          "Анализ маршрута выполнен";
          }
        }

        // Проверяем, что analysisText не пустой
        if (!analysisText || analysisText.trim().length === 0) {
          console.error("[Explore SAVE] analysisText пустой после обработки");
          Alert.alert("Ошибка", "Не удалось подготовить данные анализа для сохранения");
          return;
        }

        const analysisData = {
          analysis: analysisText,
          analysisStructured: existing.analysisStructured,
          stats: existing.stats || {
            avgSlope: 0,
            maxSlope: 0,
            steepSections: 0,
            sinuosity: 1,
            minElevation: 0,
            maxElevation: 0,
            elevationProfile: "Неизвестно",
          },
          terrainType: existing.terrainType || "неизвестно",
          geographicContext: existing.geographicContext || {
            countries: [],
            regions: [],
            areas: [],
            localities: [],
            multiRegion: false,
            multiCountry: false,
            totalPointsAnalyzed: 0,
          },
          formattedGeoContext: existing.formattedGeoContext || (existing.geographicContext ? JSON.stringify(existing.geographicContext) : "Неизвестно"),
          dailyRoutes: existing.dailyRoutes || [],
          totalDays: existing.totalDays || (existing.dailyRoutes?.length || 1),
        };

        console.log("[Explore SAVE] Prepared analysis data:", {
          hasAnalysis: !!analysisData.analysis && analysisData.analysis.length > 0,
          hasStats: !!analysisData.stats,
          hasTerrainType: !!analysisData.terrainType && analysisData.terrainType.length > 0,
          hasGeographicContext: !!analysisData.geographicContext,
          hasFormattedGeoContext: !!analysisData.formattedGeoContext && analysisData.formattedGeoContext.length > 0,
          dailyRoutesCount: analysisData.dailyRoutes.length,
          totalDays: analysisData.totalDays,
          dailyRoutesWithWeather: analysisData.dailyRoutes.filter((d: any) => d.weather).length,
          firstDayWeather: analysisData.dailyRoutes[0]?.weather ? {
            hasWeather: true,
            temperature: analysisData.dailyRoutes[0].weather.temperature,
            conditions: analysisData.dailyRoutes[0].weather.conditions,
            precipitation: analysisData.dailyRoutes[0].weather.precipitation,
            windSpeed: analysisData.dailyRoutes[0].weather.windSpeed,
          } : { hasWeather: false },
        });

        // Проверяем, что все обязательные поля заполнены
        if (!analysisData.analysis || analysisData.analysis.length === 0) {
          Alert.alert("Ошибка", "Анализ не содержит текстового описания");
          return;
        }
        if (!analysisData.stats) {
          Alert.alert("Ошибка", "Анализ не содержит статистики");
          return;
        }
        if (!analysisData.terrainType || analysisData.terrainType.length === 0) {
          Alert.alert("Ошибка", "Анализ не содержит типа местности");
          return;
        }
        if (!analysisData.geographicContext) {
          Alert.alert("Ошибка", "Анализ не содержит географического контекста");
          return;
        }

        try {
          await saveRouteAnalysis(
            savedRoute.id,
            analysisData,
            startDate,
            endDate,
            tourismType
          );
        } catch (error: any) {
          console.error("[Explore SAVE] Error saving analysis:", error);
          throw error;
        }
      }

      Alert.alert("Успех", "Маршрут сохранен", [
        {
          text: "OK",
          onPress: () => {
            setSaveRouteModalVisible(false);
            setRouteName("");
            setRouteDescription("");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Ошибка при сохранении маршрута");
    } finally {
      setSavingRoute(false);
    }
  };

  const data = existing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Настройка анализа</Text>
            {route ? (
              <Text style={styles.cardText}>
                Точек: {route.points.length} • Длина:{" "}
                {route.lengthKm.toFixed(2)} км
              </Text>
            ) : (
              <Text style={styles.note}>
                Нет маршрута. Постройте его на вкладке Главная и нажмите "i".
              </Text>
            )}
          </View>

          {/* Тип туризма */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Тип маршрута</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(() => {
                  const availableTypes = tourismTypes.filter((type) =>
                    isTourismTypeAvailable(type)
                  );
                  console.log(
                    `[EXPLORE TOURISM TYPE FILTER] Доступные типы: ${availableTypes.join(
                      ", "
                    )}, riverRouting=${
                      route?.riverRouting ?? false
                    }, roadRouting=${route?.roadRouting ?? false}`
                  );
                  return availableTypes.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        // Дополнительная проверка на всякий случай
                        if (!isTourismTypeAvailable(t)) {
                          console.log(
                            `[EXPLORE TOURISM TYPE] Блокировка выбора недоступного типа: ${t}`
                          );
                          return;
                        }
                        setTourismType(t);
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor:
                          tourismType === t ? "#007AFF" : "#f0f0f0",
                      }}
                    >
                      <Text
                        style={{ color: tourismType === t ? "#fff" : "#333" }}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            </ScrollView>
          </View>

          {/* Даты */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Даты маршрута</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Начало
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setActivePicker("start");
                    setPickerOpen(true);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#333" }}>
                    {startDate}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Конец
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setActivePicker("end");
                    setPickerOpen(true);
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#333" }}>{endDate}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {(() => {
              const start = new Date(startDate);
              const end = new Date(endDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

          {/* Кнопка Анализ */}
          <View style={{ paddingHorizontal: 4 }}>
            <TouchableOpacity
              disabled={!route || analyzeLoading}
              onPress={runAnalyze}
              style={[
                styles.analyzePrimaryButton,
                analyzeLoading && styles.analyzePrimaryButtonDisabled,
                !route && styles.analyzePrimaryButtonDisabled,
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
                <Text style={styles.analyzePrimaryText}>Проанализировать</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Прогресс */}
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

          {/* Кнопка Сохранить маршрут (показывается после анализа) */}
          {existing && route && (
            <View style={{ paddingHorizontal: 4, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setSaveRouteModalVisible(true)}
                style={[
                  styles.analyzePrimaryButton,
                  { backgroundColor: "#34C759", flexDirection: "row", alignItems: "center", justifyContent: "center" },
                ]}
              >
                <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.analyzePrimaryText}>Сохранить маршрут</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Результаты, если есть */}
          {existing && (
            <>
              {existing.analysisStructured ? (
                <>
                  {/* Резюме */}
                  <View style={styles.card}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={styles.cardTitle}>🧠 Резюме</Text>
                      <TouchableOpacity
                        onPress={() => {
                          clearCurrentRoute();
                          clearAnalysisResult();
                          setRefreshKey((k) => k + 1);
                        }}
                        style={{
                          backgroundColor: "#d00",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                          Сбросить
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardText}>
                      Сложность:{" "}
                      {existing.analysisStructured.summary?.difficultyScore ??
                        "—"}
                      /10
                    </Text>
                    {existing.analysisStructured.summary
                      ?.difficultyReasoning && (
                      <Text style={styles.cardText}>
                        {
                          existing.analysisStructured.summary
                            .difficultyReasoning
                        }
                      </Text>
                    )}
                  </View>

                  {/* Статистика */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>📈 Статистика</Text>
                    <View style={styles.statsGrid}>
                      {typeof existing.analysisStructured.stats?.distanceKm ===
                        "number" && (
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>
                            {existing.analysisStructured.stats.distanceKm.toFixed(
                              2
                            )}
                            км
                          </Text>
                          <Text style={styles.statLabel}>Дистанция</Text>
                        </View>
                      )}
                      {typeof existing.analysisStructured.stats
                        ?.elevationGainM === "number" && (
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>
                            {existing.analysisStructured.stats.elevationGainM}м
                          </Text>
                          <Text style={styles.statLabel}>Набор</Text>
                        </View>
                      )}
                      {typeof existing.analysisStructured.stats
                        ?.avgSlopePercent === "number" && (
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>
                            {existing.analysisStructured.stats.avgSlopePercent.toFixed(
                              1
                            )}
                            %
                          </Text>
                          <Text style={styles.statLabel}>Средний уклон</Text>
                        </View>
                      )}
                      {typeof existing.analysisStructured.stats
                        ?.maxSlopePercent === "number" && (
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>
                            {existing.analysisStructured.stats.maxSlopePercent.toFixed(
                              1
                            )}
                            %
                          </Text>
                          <Text style={styles.statLabel}>Макс. уклон</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* География */}
                  {(existing.analysisStructured.geography ||
                    existing.formattedGeoContext) && (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>🗺️ География</Text>
                      {existing.analysisStructured.geography?.terrainType && (
                        <View style={styles.chipContainer}>
                          <View style={styles.chip}>
                            <Text style={styles.chipText}>
                              {
                                existing.analysisStructured.geography
                                  .terrainType
                              }
                            </Text>
                          </View>
                        </View>
                      )}
                      {Array.isArray(
                        existing.analysisStructured.geography?.regions
                      ) &&
                        existing.analysisStructured.geography.regions.length >
                          0 && (
                          <Text style={styles.cardText}>
                            Регионы:{" "}
                            {existing.analysisStructured.geography.regions.join(
                              ", "
                            )}
                          </Text>
                        )}
                      {existing.formattedGeoContext && (
                        <Text style={styles.cardText}>
                          {existing.formattedGeoContext}
                        </Text>
                      )}
                      {existing.analysisStructured.geography
                        ?.physicalGeography && (
                        <View style={styles.physicalGeographyContainer}>
                          <Text style={styles.physicalGeographyTitle}>
                            Физико-географическая характеристика:
                          </Text>
                          <Text style={styles.physicalGeographyText}>
                            {
                              existing.analysisStructured.geography
                                .physicalGeography
                            }
                          </Text>
                        </View>
                      )}
                      {existing.analysisStructured.geography?.notes && (
                        <Text style={styles.cardText}>
                          {existing.analysisStructured.geography.notes}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* По дням */}
                  {Array.isArray(existing.analysisStructured.days) &&
                    existing.analysisStructured.days.length > 0 && (
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>🛣️ По дням</Text>
                        {existing.analysisStructured.days.map(
                          (d: any, i: number) => (
                            <View key={i} style={styles.dayContainer}>
                              <Text style={styles.dayTitle}>
                                День {d.day ?? i + 1}{" "}
                                {d.date ? `(${d.date})` : ""}
                              </Text>
                              <View style={styles.dayStats}>
                                {typeof d.distanceKm === "number" && (
                                  <Text style={styles.dayStat}>
                                    📏 {d.distanceKm.toFixed(2)} км
                                  </Text>
                                )}
                                {typeof d.elevationGainM === "number" && (
                                  <Text style={styles.dayStat}>
                                    ⬆️ {d.elevationGainM} м
                                  </Text>
                                )}
                                {typeof d.avgSlopePercent === "number" && (
                                  <Text style={styles.dayStat}>
                                    ↗️ уклон {d.avgSlopePercent.toFixed(1)}%
                                  </Text>
                                )}
                              </View>
                              {d.weather &&
                                (() => {
                                  const tempMin =
                                    d.weather.temperature?.min ??
                                    d.weather.temperatureMin ??
                                    0;
                                  const tempMax =
                                    d.weather.temperature?.max ??
                                    d.weather.temperatureMax ??
                                    0;
                                  const bgColor = getTemperatureColor(
                                    tempMin,
                                    tempMax
                                  );

                                  return (
                                    <View
                                      style={[
                                        styles.weatherCard,
                                        { backgroundColor: bgColor + "20" },
                                      ]}
                                    >
                                      <View style={styles.weatherHeader}>
                                        <View
                                          style={[
                                            styles.weatherIconContainer,
                                            { backgroundColor: bgColor + "30" },
                                          ]}
                                        >
                                          <Text style={styles.weatherEmoji}>
                                            {getWeatherEmoji(
                                              d.weather.conditions || ""
                                            )}
                                          </Text>
                                        </View>
                                        <View style={styles.weatherMainInfo}>
                                          <Text style={styles.weatherTemp}>
                                            {tempMin}° / {tempMax}°
                                          </Text>
                                          <Text
                                            style={styles.weatherConditions}
                                          >
                                            {d.weather.conditions ||
                                              "данные недоступны"}
                                          </Text>
                                        </View>
                                      </View>
                                      <View style={styles.weatherDetailsRow}>
                                        <View style={styles.weatherDetailItem}>
                                          <Text
                                            style={styles.weatherDetailIcon}
                                          >
                                            {getWindEmoji(
                                              d.weather.windSpeed || 0
                                            )}
                                          </Text>
                                          <Text
                                            style={styles.weatherDetailText}
                                          >
                                            {d.weather.windSpeed || 0} м/с
                                          </Text>
                                        </View>
                                        <View style={styles.weatherDetailItem}>
                                          <Text
                                            style={styles.weatherDetailIcon}
                                          >
                                            {getPrecipitationEmoji(
                                              d.weather.precipitation || 0
                                            )}
                                          </Text>
                                          <Text
                                            style={styles.weatherDetailText}
                                          >
                                            {d.weather.precipitation || 0} мм
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  );
                                })()}
                              {Array.isArray(d.keyPoints) &&
                                d.keyPoints.length > 0 && (
                                  <Text style={styles.cardText}>
                                    Ключевые точки: {d.keyPoints.join(", ")}
                                  </Text>
                                )}
                              {d.description && (
                                <Text style={styles.dayDescription}>
                                  {d.description}
                                </Text>
                              )}
                              {Array.isArray(d.recommendations) &&
                                d.recommendations.length > 0 && (
                                  <Text style={styles.cardText}>
                                    Рекомендации: {d.recommendations.join(", ")}
                                  </Text>
                                )}
                            </View>
                          )
                        )}
                      </View>
                    )}

                  {/* Рекомендации и предупреждения */}
                  {Array.isArray(existing.analysisStructured.recommendations) &&
                    existing.analysisStructured.recommendations.length > 0 && (
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>🎯 Рекомендации</Text>
                        {existing.analysisStructured.recommendations.map(
                          (r: string, i: number) => (
                            <Text key={i} style={styles.recommendationItem}>
                              • {r}
                            </Text>
                          )
                        )}
                      </View>
                    )}

                  {Array.isArray(existing.analysisStructured.warnings) &&
                    existing.analysisStructured.warnings.length > 0 && (
                      <View style={[styles.card, styles.warningCard]}>
                        <Text style={styles.warningTitle}>⚠️ Важно знать</Text>
                        {existing.analysisStructured.warnings.map(
                          (w: string, i: number) => (
                            <Text key={i} style={styles.warningText}>
                              • {w}
                            </Text>
                          )
                        )}
                      </View>
                    )}
                </>
              ) : (
                // Фоллбэк: простой текст, если JSON не распарсился
                <View style={styles.card}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={styles.cardTitle}>🧠 Резюме ИИ</Text>
                    <TouchableOpacity
                      onPress={() => {
                        clearCurrentRoute();
                        clearAnalysisResult();
                        setRefreshKey((k) => k + 1);
                      }}
                      style={{
                        backgroundColor: "#d00",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Сбросить
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.cardText,
                      { fontFamily: "monospace", fontSize: 12 },
                    ]}
                  >
                    {existing.analysis
                      ? // Пытаемся распарсить JSON вручную для красивого отображения
                        (() => {
                          try {
                            const json = JSON.parse(existing.analysis);
                            return JSON.stringify(json, null, 2);
                          } catch {
                            return existing.analysis;
                          }
                        })()
                      : "Анализ недоступен"}
                  </Text>
                  <Text
                    style={[
                      styles.cardText,
                      { marginTop: 8, fontSize: 11, color: "#999" },
                    ]}
                  >
                    ⚠️ JSON не распарсился автоматически. Показывается сырой
                    ответ.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Single Date Picker - Android inline */}
      {pickerOpen && Platform.OS === "android" && (
        <View style={styles.pickerInlineContainer}>
          <View style={styles.pickerInlineCard}>
            <Text style={styles.pickerModalTitle}>
              {activePicker === "start"
                ? "Выберите дату начала"
                : "Выберите дату окончания"}
            </Text>
            <View style={styles.pickerContainerBox}>
              {activePicker === "start" ? (
                <DateTimePicker
                  value={startDateObj}
                  mode="date"
                  display="default"
                  onChange={(_, d) => d && setStartDateObj(d)}
                  minimumDate={new Date()}
                />
              ) : activePicker === "end" ? (
                <DateTimePicker
                  value={endDateObj}
                  mode="date"
                  display="default"
                  onChange={(_, d) => d && setEndDateObj(d)}
                  minimumDate={startDateObj}
                />
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setPickerOpen(false);
                  setActivePicker(null);
                }}
                style={styles.pickerCancelButton}
              >
                <Text style={styles.pickerCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (activePicker === "start") {
                    setStartDate(startDateObj.toISOString().slice(0, 10));
                  } else if (activePicker === "end") {
                    setEndDate(endDateObj.toISOString().slice(0, 10));
                  }
                  setPickerOpen(false);
                  setActivePicker(null);
                }}
                style={styles.pickerOkButton}
              >
                <Text style={styles.pickerOkText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Single Date Picker Modal - iOS */}
      {pickerOpen && Platform.OS === "ios" && (
        <Modal
          transparent
          statusBarTranslucent
          animationType="fade"
          visible
          onRequestClose={() => {
            setPickerOpen(false);
            setActivePicker(null);
          }}
        >
          <View style={styles.pickerModalBackdrop}>
            <View style={styles.pickerModalCard}>
              <Text style={styles.pickerModalTitle}>
                {activePicker === "start"
                  ? "Выберите дату начала"
                  : "Выберите дату окончания"}
              </Text>
              <View style={styles.pickerContainerBox}>
                {activePicker === "start" ? (
                  <DateTimePicker
                    value={startDateObj}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => d && setStartDateObj(d)}
                    minimumDate={new Date()}
                    themeVariant="light"
                  />
                ) : activePicker === "end" ? (
                  <DateTimePicker
                    value={endDateObj}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => d && setEndDateObj(d)}
                    minimumDate={startDateObj}
                    themeVariant="light"
                  />
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setPickerOpen(false);
                    setActivePicker(null);
                  }}
                  style={styles.pickerCancelButton}
                >
                  <Text style={styles.pickerCancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (activePicker === "start") {
                      setStartDate(startDateObj.toISOString().slice(0, 10));
                    } else if (activePicker === "end") {
                      setEndDate(endDateObj.toISOString().slice(0, 10));
                    }
                    setPickerOpen(false);
                    setActivePicker(null);
                  }}
                  style={styles.pickerOkButton}
                >
                  <Text style={styles.pickerOkText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Модальное окно сохранения маршрута */}
      <Modal
        visible={saveRouteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveRouteModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 20,
                color: "#333",
              }}
            >
              Сохранить маршрут
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }}>
                Название маршрута *
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#f5f5f5",
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: "#333",
                }}
                placeholder="Введите название"
                value={routeName}
                onChangeText={setRouteName}
                autoFocus
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }}>
                Описание (необязательно)
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#f5f5f5",
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: "#333",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                placeholder="Введите описание маршрута"
                value={routeDescription}
                onChangeText={setRouteDescription}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setSaveRouteModalVisible(false);
                  setRouteName("");
                  setRouteDescription("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: "#f0f0f0",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#666" }}>
                  Отмена
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRoute}
                style={[
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: "#34C759",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  },
                  savingRoute && { opacity: 0.6 },
                ]}
                disabled={savingRoute}
              >
                {savingRoute ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                    Сохранить
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
