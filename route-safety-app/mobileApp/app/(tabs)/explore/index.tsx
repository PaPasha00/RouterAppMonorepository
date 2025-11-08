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
import { useMemo, useState } from "react";
import { API_CONFIG, getApiUrl, apiPost } from "../../../config/api";
import { getElevationData } from "../home/helpers";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const existing = getAnalysisResult();
  const route = getCurrentRoute();

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

  const tourismTypes = [
    "пеший",
    "велосипедный",
    "водный",
    "автомобильный",
    "воздушный",
    "мото",
  ];

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
        coords.length
      );
      const result = await apiPost<any>(
        API_CONFIG.ENDPOINTS.ANALYZE_ROUTE,
        body
      );

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
            <Text style={styles.cardTitle}>Тип туризма</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {tourismTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTourismType(t)}
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
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Даты */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Даты похода</Text>
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
    </SafeAreaView>
  );
}
