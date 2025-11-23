import * as SecureStore from 'expo-secure-store';
import { getApiUrl } from '../config/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

/**
 * Сохраняет токен в безопасное хранилище
 */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Получает токен из безопасного хранилища
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Ошибка получения токена:', error);
    return null;
  }
}

/**
 * Удаляет токен из хранилища
 */
export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Сохраняет информацию о пользователе
 */
export async function saveUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Получает информацию о пользователе
 */
export async function getUser(): Promise<User | null> {
  try {
    const userStr = await SecureStore.getItemAsync(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Вход пользователя
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка входа' }));
    throw new Error(error.error || 'Ошибка входа');
  }

  const result: AuthResponse = await response.json();
  await saveToken(result.token);
  await saveUser(result.user);
  return result;
}

/**
 * Регистрация пользователя
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(getApiUrl('/api/auth/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка регистрации' }));
    throw new Error(error.error || 'Ошибка регистрации');
  }

  const result: AuthResponse = await response.json();
  await saveToken(result.token);
  await saveUser(result.user);
  return result;
}

/**
 * Получение информации о текущем пользователе
 */
export async function getCurrentUser(): Promise<User> {
  const token = await getToken();
  if (!token) {
    throw new Error('Пользователь не авторизован');
  }

  const response = await fetch(getApiUrl('/api/auth/me'), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await removeToken();
    }
    const error = await response.json().catch(() => ({ error: 'Ошибка получения пользователя' }));
    throw new Error(error.error || 'Ошибка получения пользователя');
  }

  const result = await response.json();
  await saveUser(result.user);
  return result.user;
}

/**
 * Выход пользователя
 */
export async function logout(): Promise<void> {
  await removeToken();
}

/**
 * Проверяет, авторизован ли пользователь
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

