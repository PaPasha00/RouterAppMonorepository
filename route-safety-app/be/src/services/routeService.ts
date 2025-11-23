import { v4 as uuidv4 } from 'uuid';
import db from '../database/db';

export interface SavedRoute {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  waypointNames?: Record<number, string>;
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteData {
  userId: string;
  name: string;
  description?: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  waypointNames?: Record<number, string>;
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
}

export interface UpdateRouteData {
  name?: string;
  description?: string;
}

/**
 * Создает новый сохраненный маршрут
 */
export function createRoute(data: CreateRouteData): SavedRoute {
  const id = uuidv4();
  const now = new Date().toISOString();

  const route: SavedRoute = {
    id,
    userId: data.userId,
    name: data.name,
    description: data.description,
    coordinates: data.coordinates,
    waypointNames: data.waypointNames,
    roadRouting: data.roadRouting,
    riverRouting: data.riverRouting,
    lengthKm: data.lengthKm,
    createdAt: now,
    updatedAt: now,
  };

  const stmt = db.prepare(`
    INSERT INTO saved_routes (
      id, userId, name, description, coordinates, waypointNames,
      roadRouting, riverRouting, lengthKm, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    route.id,
    route.userId,
    route.name,
    route.description || null,
    JSON.stringify(route.coordinates),
    route.waypointNames ? JSON.stringify(route.waypointNames) : null,
    route.roadRouting ? 1 : 0,
    route.riverRouting ? 1 : 0,
    route.lengthKm,
    route.createdAt,
    route.updatedAt
  );

  return route;
}

/**
 * Получает все маршруты пользователя
 */
export function getUserRoutes(userId: string): SavedRoute[] {
  const stmt = db.prepare('SELECT * FROM saved_routes WHERE userId = ? ORDER BY createdAt DESC');
  const rows = stmt.all(userId) as any[];

  return rows.map(rowToRoute);
}

/**
 * Получает маршрут по ID
 */
export function getRouteById(routeId: string, userId: string): SavedRoute | null {
  const stmt = db.prepare('SELECT * FROM saved_routes WHERE id = ? AND userId = ?');
  const row = stmt.get(routeId, userId) as any;

  return row ? rowToRoute(row) : null;
}

/**
 * Обновляет маршрут
 */
export function updateRoute(routeId: string, userId: string, data: UpdateRouteData): SavedRoute | null {
  const route = getRouteById(routeId, userId);
  if (!route) {
    return null;
  }

  const updatedRoute: SavedRoute = {
    ...route,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    UPDATE saved_routes
    SET name = ?, description = ?, updatedAt = ?
    WHERE id = ? AND userId = ?
  `);

  stmt.run(
    updatedRoute.name,
    updatedRoute.description || null,
    updatedRoute.updatedAt,
    routeId,
    userId
  );

  return updatedRoute;
}

/**
 * Удаляет маршрут
 */
export function deleteRoute(routeId: string, userId: string): boolean {
  const stmt = db.prepare('DELETE FROM saved_routes WHERE id = ? AND userId = ?');
  const result = stmt.run(routeId, userId);

  return result.changes > 0;
}

/**
 * Преобразует строку БД в объект SavedRoute
 */
function rowToRoute(row: any): SavedRoute {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    coordinates: JSON.parse(row.coordinates),
    waypointNames: row.waypointNames ? JSON.parse(row.waypointNames) : undefined,
    roadRouting: row.roadRouting === 1,
    riverRouting: row.riverRouting === 1,
    lengthKm: row.lengthKm,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

