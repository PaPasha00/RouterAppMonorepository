import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'app.db');

// Создаем директорию для БД, если её нет
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Создаем подключение к БД
const db: DatabaseType = new Database(DB_FILE);

// Включаем foreign keys
db.pragma('foreign_keys = ON');

// Создаем таблицу пользователей, если её нет
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

  CREATE TABLE IF NOT EXISTS saved_routes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    coordinates TEXT NOT NULL,
    waypointNames TEXT,
    roadRouting INTEGER NOT NULL DEFAULT 0,
    riverRouting INTEGER NOT NULL DEFAULT 0,
    lengthKm REAL NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_saved_routes_userId ON saved_routes(userId);
  CREATE INDEX IF NOT EXISTS idx_saved_routes_createdAt ON saved_routes(createdAt DESC);

  CREATE TABLE IF NOT EXISTS route_analyses (
    id TEXT PRIMARY KEY,
    routeId TEXT NOT NULL,
    userId TEXT NOT NULL,
    analysis TEXT NOT NULL,
    analysisStructured TEXT,
    stats TEXT NOT NULL,
    terrainType TEXT NOT NULL,
    geographicContext TEXT NOT NULL,
    formattedGeoContext TEXT NOT NULL,
    dailyRoutes TEXT,
    totalDays INTEGER NOT NULL,
    startDate TEXT,
    endDate TEXT,
    tourismType TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (routeId) REFERENCES saved_routes(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_route_analyses_routeId ON route_analyses(routeId);
  CREATE INDEX IF NOT EXISTS idx_route_analyses_userId ON route_analyses(userId);
`);

console.log('✅ SQLite база данных инициализирована:', DB_FILE);

export default db;

