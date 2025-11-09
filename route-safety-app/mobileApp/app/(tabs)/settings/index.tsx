import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { styles } from "./styles";
import {
  loadSettings,
  saveSettings,
  getSettings,
  clearSettingsCache,
  Settings,
} from "../../../store/settingsStore";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({
    pointsPerDay: 20,
    usePointsSystem: true,
    includeAIRecommendations: true,
  });
  const [pointsInput, setPointsInput] = useState("20");
  const [usePointsSystem, setUsePointsSystem] = useState(true);
  const [includeAIRecommendations, setIncludeAIRecommendations] =
    useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const loaded = await loadSettings();
      setSettings(loaded);
      setPointsInput(loaded.pointsPerDay.toString());
      setUsePointsSystem(loaded.usePointsSystem ?? true);
      setIncludeAIRecommendations(loaded.includeAIRecommendations ?? true);
    } catch (error) {
      console.error("[SETTINGS] Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const points = parseInt(pointsInput, 10);
    if (isNaN(points) || points < 1 || points > 100) {
      Alert.alert("Ошибка", "Количество очков должно быть от 1 до 100");
      return;
    }

    const newSettings: Settings = {
      pointsPerDay: points,
      usePointsSystem,
      includeAIRecommendations,
    };

    try {
      await saveSettings(newSettings);
      setSettings(newSettings);
      // Кэш уже обновлен в saveSettings, но на всякий случай сбрасываем
      clearSettingsCache();
      console.log("[SETTINGS] Настройки сохранены:", newSettings);
      Alert.alert("Успешно", "Настройки сохранены");
      // Возвращаемся на главный экран, чтобы изменения применились
      router.back();
    } catch (error) {
      console.error("[SETTINGS] Ошибка сохранения:", error);
      Alert.alert("Ошибка", "Не удалось сохранить настройки");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Настройки</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Система очков</Text>
          <Text style={styles.cardText}>
            Использовать систему очков для разбивки маршрута по дням.
            {"\n\n"}
            Формула расчета очков:
            {"\n"}• 1 км по прямой = 1 очко
            {"\n"}• 1 км вверх (набор высоты) = 10 очков
            {"\n\n"}
            Пример: 5 км по прямой + 0.5 км вверх = 5 + 5 = 10 очков
            {"\n\n"}
            ⚠️ Система очков работает только для следующих типов туризма:
            {"\n"}• Пеший
            {"\n"}• Горный
            {"\n"}• Лыжный
            {"\n\n"}
            Для других типов (велосипедный, водный, автомобильный и т.д.)
            система очков автоматически отключается.
          </Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Использовать систему очков</Text>
            <Switch
              value={usePointsSystem}
              onValueChange={setUsePointsSystem}
              trackColor={{ false: "#767577", true: "#007AFF" }}
              thumbColor={usePointsSystem ? "#fff" : "#f4f3f4"}
            />
          </View>

          {usePointsSystem && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Максимум очков в день:</Text>
              <TextInput
                style={styles.input}
                value={pointsInput}
                onChangeText={setPointsInput}
                keyboardType="numeric"
                placeholder="20"
              />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Рекомендации ИИ</Text>
          <Text style={styles.cardText}>
            Включать ли рекомендации от искусственного интеллекта в анализ
            маршрута.
            {"\n\n"}
            Рекомендации могут включать советы по экипировке, безопасности,
            погодным условиям и другим аспектам похода.
          </Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Включать рекомендации ИИ</Text>
            <Switch
              value={includeAIRecommendations}
              onValueChange={setIncludeAIRecommendations}
              trackColor={{ false: "#767577", true: "#007AFF" }}
              thumbColor={includeAIRecommendations ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Сохранить настройки</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
