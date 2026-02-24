import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import {
  login,
  register,
  logout,
  getUser,
  isAuthenticated,
  User,
} from "../../../services/authService";
import {
  getRoutes,
  deleteRoute,
  SavedRoute,
} from "../../../services/routeService";

type AuthMode = "login" | "register";

export default function ProfileScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Форма входа
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadRoutes();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const userData = await getUser();
        setUser(userData);
      }
    } catch (error) {
      console.error("Ошибка проверки авторизации:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadRoutes = async () => {
    if (!user) return;
    setLoadingRoutes(true);
    try {
      const userRoutes = await getRoutes();
      setRoutes(userRoutes);
    } catch (error: any) {
      console.error("Ошибка загрузки маршрутов:", error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, password });
      setUser(result.user);
      Alert.alert("Успех", "Вы успешно вошли в систему");
      setEmail("");
      setPassword("");
    } catch (error: any) {
      Alert.alert("Ошибка входа", error.message || "Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Ошибка", "Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoading(true);
    try {
      const result = await register({ email, username, password });
      setUser(result.user);
      Alert.alert("Успех", "Регистрация прошла успешно");
      setEmail("");
      setPassword("");
      setUsername("");
      setMode("login");
    } catch (error: any) {
      Alert.alert("Ошибка регистрации", error.message || "Ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setRoutes([]);
      Alert.alert("Успех", "Вы вышли из системы");
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Ошибка при выходе");
    }
  };

  const handleDeleteRoute = (routeId: string, routeName: string) => {
    Alert.alert(
      "Удалить маршрут?",
      `Вы уверены, что хотите удалить маршрут "${routeName}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRoute(routeId);
              await loadRoutes();
              Alert.alert("Успех", "Маршрут удален");
            } catch (error: any) {
              Alert.alert("Ошибка", error.message || "Ошибка при удалении маршрута");
            }
          },
        },
      ]
    );
  };

  const handleRoutePress = (route: SavedRoute) => {
    router.push({
      pathname: "/(tabs)/profile/[id]",
      params: { id: route.id },
    });
  };

  if (checkingAuth) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.username}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{routes.length}</Text>
              <Text style={styles.statLabel}>Маршрутов</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.logoutButtonText}>Выйти</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>Сохраненные маршруты</Text>
          {loadingRoutes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : routes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Нет сохраненных маршрутов</Text>
              <Text style={styles.emptySubtext}>
                Создайте маршрут на главной странице и сохраните его
              </Text>
            </View>
          ) : (
            routes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => handleRoutePress(route)}
              >
                <View style={styles.routeCardHeader}>
                  <View style={styles.routeCardIcon}>
                    <Ionicons
                      name={
                        route.riverRouting
                          ? "water"
                          : route.roadRouting
                          ? "car"
                          : "map"
                      }
                      size={24}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.routeCardContent}>
                    <Text style={styles.routeCardTitle} numberOfLines={1}>
                      {route.name}
                    </Text>
                    {route.description && (
                      <Text style={styles.routeCardDescription} numberOfLines={2}>
                        {route.description}
                      </Text>
                    )}
                    <View style={styles.routeCardMeta}>
                      <Text style={styles.routeCardMetaText}>
                        {route.lengthKm.toFixed(2)} км
                      </Text>
                      <Text style={styles.routeCardMetaText}>•</Text>
                      <Text style={styles.routeCardMetaText}>
                        {new Date(route.createdAt).toLocaleDateString("ru-RU")}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.routeCardDelete}
                  onPress={() => handleDeleteRoute(route.id, route.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.authContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.authTitle}>
          {mode === "login" ? "Вход" : "Регистрация"}
        </Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === "login" && styles.toggleButtonActive]}
            onPress={() => setMode("login")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                mode === "login" && styles.toggleButtonTextActive,
              ]}
            >
              Вход
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === "register" && styles.toggleButtonActive]}
            onPress={() => setMode("register")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                mode === "register" && styles.toggleButtonTextActive,
              ]}
            >
              Регистрация
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Имя пользователя</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите имя пользователя"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите пароль"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={mode === "login" ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Войти" : "Зарегистрироваться"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
