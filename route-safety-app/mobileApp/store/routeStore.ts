export type LatLng = { latitude: number; longitude: number };

export type CurrentRoute = {
  points: LatLng[];
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
} | null;

let currentRoute: CurrentRoute = null;

export function setCurrentRoute(route: CurrentRoute) {
  currentRoute = route;
}

export function getCurrentRoute(): CurrentRoute {
  return currentRoute;
}

export function clearCurrentRoute() {
  currentRoute = null;
}
