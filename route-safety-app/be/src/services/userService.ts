import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

/**
 * Находит пользователя по email
 */
export function findUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  const row = stmt.get(email) as any;
  return row ? rowToUser(row) : null;
}

/**
 * Находит пользователя по username
 */
export function findUserByUsername(username: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
  const row = stmt.get(username) as any;
  return row ? rowToUser(row) : null;
}

/**
 * Находит пользователя по ID
 */
export function findUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as any;
  return row ? rowToUser(row) : null;
}

/**
 * Создает нового пользователя
 */
export async function createUser(data: CreateUserData): Promise<User> {
  // Проверка на существующего пользователя
  if (findUserByEmail(data.email)) {
    throw new Error('Пользователь с таким email уже существует');
  }
  if (findUserByUsername(data.username)) {
    throw new Error('Пользователь с таким именем уже существует');
  }

  // Хеширование пароля
  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser: User = {
    id: uuidv4(),
    email: data.email.toLowerCase(),
    username: data.username,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    INSERT INTO users (id, email, username, passwordHash, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    newUser.id,
    newUser.email,
    newUser.username,
    newUser.passwordHash,
    newUser.createdAt,
    newUser.updatedAt
  );

  return newUser;
}

/**
 * Проверяет пароль пользователя
 */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Преобразует строку БД в объект User
 */
function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

