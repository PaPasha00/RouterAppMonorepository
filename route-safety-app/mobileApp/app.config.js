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
        ITSAppUsesNonExemptEncryption: false,
        // Разрешаем HTTP запросы для нашего API сервера
        NSAppTransportSecurity: {
          NSExceptionDomains: {
            "46.188.41.57": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false
            },
            "localhost": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false
            },
            "172.20.10.4": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false
            }
          },
          // ВРЕМЕННО: разрешаем все HTTP для разработки (будет исправлено в production build)
          NSAllowsArbitraryLoads: true
        }
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
      ],
      // Разрешаем HTTP запросы для Android
      usesCleartextTraffic: true
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
      // Автоматическое определение URL:
      // - Если установлена переменная окружения EXPO_PUBLIC_API_BASE_URL - используется она
      // - Иначе автоматически определяется: localhost для веба/симулятора, production для реального устройства
      // Можно переопределить через .env файл: EXPO_PUBLIC_API_BASE_URL=http://your-server:port
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || undefined,
      eas: {
        projectId: "183e51d5-d099-4e16-b8cb-a9806979afd5"
      }
    },
    owner: "pavelvasev0000"
  }
};

