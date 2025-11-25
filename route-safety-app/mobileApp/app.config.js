// app.config.js - динамическая конфигурация с поддержкой переменных окружения
require('dotenv').config();

module.exports = {
  expo: {
    name: "Route Safety App",
    slug: "route-safety-app",
    version: "1.0.0",
    newArchEnabled: true,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.routesafety.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Это приложение использует местоположение для отображения карты и поиска мест.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.routesafety.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Это приложение использует местоположение для отображения карты и поиска мест."
        }
      ]
    ],
    extra: {
      // Используем переменную окружения или значение по умолчанию
      // Для реального устройства используйте IP адрес вашего компьютера
      // Узнайте IP: ifconfig | grep "inet " | grep -v 127.0.0.1
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://172.20.10.3:3001",
      eas: {
        projectId: "183e51d5-d099-4e16-b8cb-a9806979afd5"
      }
    },
    owner: "pavelvasev0000"
  }
};

