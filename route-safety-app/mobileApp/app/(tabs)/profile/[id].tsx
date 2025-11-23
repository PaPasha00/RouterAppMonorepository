import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./routeDetailsStyles";
import { getRoute, SavedRoute, RouteAnalysis } from "../../../services/routeService";
import { setRouteToLoad } from "../../../store/routeStore";

export default function RouteDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    loadRoute();
  }, [id]);

  const loadRoute = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getRoute(id);
      setRoute(result.route);
      if (result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Ошибка загрузки маршрута");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOnHome = () => {
    if (!route) return;
    
    // Устанавливаем маршрут для загрузки на главной странице
    setRouteToLoad({
      points: route.coordinates,
      roadRouting: route.roadRouting,
      riverRouting: route.riverRouting,
      waypointNames: route.waypointNames,
    });
    
    // Переходим на главную страницу
    router.push("/(tabs)/home");
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Маршрут не найден</Text>
      </View>
    );
  }

  const structuredAnalysis = analysis?.analysisStructured;
  // Используем dailyRoutes из анализа, если они есть, иначе из structuredAnalysis.days
  const daysWithWeather = analysis?.dailyRoutes && analysis.dailyRoutes.length > 0 
    ? analysis.dailyRoutes 
    : structuredAnalysis?.days || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {route.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Основная информация */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={route.riverRouting ? "water" : route.roadRouting ? "car" : "map"}
            size={24}
            color="#007AFF"
          />
          <Text style={styles.cardTitle}>Информация о маршруте</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Длина:</Text>
          <Text style={styles.infoValue}>{route.lengthKm.toFixed(2)} км</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Тип:</Text>
          <Text style={styles.infoValue}>
            {route.riverRouting
              ? "По реке"
              : route.roadRouting
              ? "По дорогам"
              : "Прямая линия"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Точек:</Text>
          <Text style={styles.infoValue}>{route.coordinates.length}</Text>
        </View>
        {route.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Описание:</Text>
            <Text style={styles.descriptionText}>{route.description}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.mapButton} onPress={handleOpenOnHome}>
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.mapButtonText}>Открыть на главной</Text>
        </TouchableOpacity>
      </View>

      {/* Анализ ИИ */}
      {analysis && (
        <>
          {/* Общая информация */}
          {structuredAnalysis && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() =>
                  setExpandedSection(expandedSection === "summary" ? null : "summary")
                }
              >
                <Ionicons name="analytics" size={24} color="#007AFF" />
                <Text style={styles.cardTitle}>Общий анализ</Text>
                <Ionicons
                  name={expandedSection === "summary" ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {expandedSection === "summary" && (
                <View style={styles.sectionContent}>
                  <View style={styles.difficultyContainer}>
                    <Text style={styles.difficultyLabel}>Сложность:</Text>
                    <View style={styles.difficultyScore}>
                      <Text style={styles.difficultyValue}>
                        {structuredAnalysis.summary?.difficultyScore || "N/A"}
                      </Text>
                      <Text style={styles.difficultyMax}>/10</Text>
                    </View>
                  </View>
                  {structuredAnalysis.summary?.difficultyReasoning && (
                    <Text style={styles.difficultyReasoning}>
                      {structuredAnalysis.summary.difficultyReasoning}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Статистика */}
          {structuredAnalysis?.stats && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === "stats" ? null : "stats")
                  }
                >
                  <Ionicons name="stats-chart" size={24} color="#007AFF" />
                  <Text style={styles.cardTitle}>Статистика</Text>
                  <Ionicons
                    name={expandedSection === "stats" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === "stats" && (
                  <View style={styles.sectionContent}>
                    <View style={styles.statGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {structuredAnalysis.stats.distanceKm?.toFixed(2) || "N/A"}
                        </Text>
                        <Text style={styles.statLabel}>км</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {structuredAnalysis.stats.elevationGainM?.toFixed(0) || "N/A"}
                        </Text>
                        <Text style={styles.statLabel}>м подъема</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {structuredAnalysis.stats.maxSlopePercent?.toFixed(1) || "N/A"}
                        </Text>
                        <Text style={styles.statLabel}>% макс. уклон</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

          {/* География */}
          {structuredAnalysis?.geography && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === "geography" ? null : "geography")
                  }
                >
                  <Ionicons name="globe" size={24} color="#007AFF" />
                  <Text style={styles.cardTitle}>География</Text>
                  <Ionicons
                    name={expandedSection === "geography" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === "geography" && (
                  <View style={styles.sectionContent}>
                    <Text style={styles.geographyText}>
                      {structuredAnalysis.geography.physicalGeography || "N/A"}
                    </Text>
                    {structuredAnalysis.geography.regions &&
                      structuredAnalysis.geography.regions.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {structuredAnalysis.geography.regions.map((region, idx) => (
                            <View key={idx} style={styles.tag}>
                              <Text style={styles.tagText}>{region}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                  </View>
                )}
              </View>
            )}

          {/* Рекомендации */}
          {structuredAnalysis?.recommendations &&
            structuredAnalysis.recommendations.length > 0 && (
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() =>
                      setExpandedSection(
                        expandedSection === "recommendations" ? null : "recommendations"
                      )
                    }
                  >
                    <Ionicons name="bulb" size={24} color="#007AFF" />
                    <Text style={styles.cardTitle}>Рекомендации</Text>
                    <Ionicons
                      name={expandedSection === "recommendations" ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {expandedSection === "recommendations" && (
                    <View style={styles.sectionContent}>
                      {structuredAnalysis.recommendations.map((rec, idx) => (
                        <View key={idx} style={styles.recommendationItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

          {/* Предупреждения */}
          {structuredAnalysis?.warnings && structuredAnalysis.warnings.length > 0 && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === "warnings" ? null : "warnings")
                  }
                >
                  <Ionicons name="warning" size={24} color="#FF9500" />
                  <Text style={styles.cardTitle}>Предупреждения</Text>
                  <Ionicons
                    name={expandedSection === "warnings" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === "warnings" && (
                  <View style={styles.sectionContent}>
                    {structuredAnalysis.warnings.map((warning, idx) => (
                      <View key={idx} style={styles.warningItem}>
                        <Ionicons name="alert-circle" size={16} color="#FF9500" />
                        <Text style={styles.warningText}>{warning}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          {/* Дни маршрута */}
          {daysWithWeather && daysWithWeather.length > 0 && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === "days" ? null : "days")
                  }
                >
                  <Ionicons name="calendar" size={24} color="#007AFF" />
                  <Text style={styles.cardTitle}>
                    Дни маршрута ({daysWithWeather.length})
                  </Text>
                  <Ionicons
                    name={expandedSection === "days" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === "days" && (
                  <View style={styles.sectionContent}>
                    {daysWithWeather.map((day: any, idx: number) => (
                      <View key={idx} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                          <Text style={styles.dayNumber}>День {day.day}</Text>
                          <Text style={styles.dayDate}>{day.date}</Text>
                        </View>
                        <View style={styles.dayStats}>
                          <Text style={styles.dayStatText}>
                            {day.distanceKm?.toFixed(2) || "N/A"} км
                          </Text>
                          <Text style={styles.dayStatText}>•</Text>
                          <Text style={styles.dayStatText}>
                            {day.elevationGainM?.toFixed(0) || "N/A"} м
                          </Text>
                        </View>
                        {day.weather && (
                          <View style={styles.dayWeather}>
                            <View style={styles.weatherRow}>
                              <Ionicons name="thermometer" size={16} color="#FF9500" />
                              <Text style={styles.weatherText}>
                                {day.weather.temperatureMin || day.weather.temperature?.min || "—"}° / {day.weather.temperatureMax || day.weather.temperature?.max || "—"}°
                              </Text>
                            </View>
                            {(day.weather.conditions || day.weather.description) && (
                              <View style={styles.weatherRow}>
                                <Ionicons name="cloud" size={16} color="#007AFF" />
                                <Text style={styles.weatherText}>
                                  {day.weather.conditions || day.weather.description}
                                </Text>
                              </View>
                            )}
                            {day.weather.precipitation !== undefined && day.weather.precipitation > 0 && (
                              <View style={styles.weatherRow}>
                                <Ionicons name="rainy" size={16} color="#5AC8FA" />
                                <Text style={styles.weatherText}>
                                  Осадки: {day.weather.precipitation} мм
                                </Text>
                              </View>
                            )}
                            {day.weather.windSpeed !== undefined && day.weather.windSpeed > 0 && (
                              <View style={styles.weatherRow}>
                                <Ionicons name="flag" size={16} color="#8E8E93" />
                                <Text style={styles.weatherText}>
                                  Ветер: {day.weather.windSpeed} м/с
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                        {day.description && (
                          <Text style={styles.dayDescription}>{day.description}</Text>
                        )}
                        {day.recommendations && day.recommendations.length > 0 && (
                          <View style={styles.dayRecommendations}>
                            {day.recommendations.map((rec, recIdx) => (
                              <Text key={recIdx} style={styles.dayRecommendationText}>
                                • {rec}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          {/* Сырой текст анализа (fallback) */}
          {!structuredAnalysis && analysis.analysis && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Анализ маршрута</Text>
              <Text style={styles.rawAnalysisText}>{analysis.analysis}</Text>
            </View>
          )}
        </>
      )}

      {!analysis && (
        <View style={styles.card}>
          <Text style={styles.noAnalysisText}>
            Анализ ИИ для этого маршрута еще не выполнен
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

