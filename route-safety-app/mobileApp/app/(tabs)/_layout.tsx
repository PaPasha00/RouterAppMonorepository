import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { TouchableOpacity, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home/index"
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
          includeFontPadding: false,
          textAlignVertical: "center",
        },
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 24,
          left: 16,
          right: 16,
          bottom: 24,
          height: 65,
          borderRadius: 60,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 0,
          paddingVertical: 20,
          overflow: "hidden",
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            style={[props.style, styles.tabBarButton]}
            activeOpacity={0.7}
          />
        ),
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={{ flex: 1 }} />
        ),
        headerStyle: {
          backgroundColor: "rgba(0, 0, 0, 0)",
        },
        headerTintColor: "#000",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Главная",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore/index"
        options={{
          title: "Исследовать",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/[id]"
        options={{
          href: null, // Скрываем динамический маршрут из табов
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 65,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});
