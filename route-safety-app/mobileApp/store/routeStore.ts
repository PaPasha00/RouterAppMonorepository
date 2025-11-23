export type LatLng = { latitude: number; longitude: number };

export type CurrentRoute = {
  points: LatLng[];
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
} | null;

export type RouteToLoad = {
  points: LatLng[];
  roadRouting: boolean;
  riverRouting: boolean;
  waypointNames?: Record<number, string>;
} | null;

let currentRoute: CurrentRoute = null;
let routeToLoad: RouteToLoad = null;

export function setCurrentRoute(route: CurrentRoute) {
  currentRoute = route;
}

export function getCurrentRoute(): CurrentRoute {
  return currentRoute;
}

export function clearCurrentRoute() {
  currentRoute = null;
}

export function setRouteToLoad(route: RouteToLoad) {
  routeToLoad = route;
}

export function getRouteToLoad(): RouteToLoad {
  return routeToLoad;
}

export function clearRouteToLoad() {
  routeToLoad = null;
}
