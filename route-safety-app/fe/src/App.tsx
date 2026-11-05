import { useCallback, useEffect, useRef, useState } from "react";
import { ElevationStats, LatLngTuple, RecentRoute, RouteAnnotation } from "./types";
import MapContainer from "./components/Map/MapContainer";
import RouteInfo from "./components/RouteInfo/RouteInfo";
import { calculateElevationStats, calculateRouteLength } from "./helpers/routeCalculations";
import { getElevationData, simulateElevationData } from "./helpers/elevationData";
import { fetchRiverRoute } from "./helpers/riverRouting";
import styles from "./App.module.scss";

function App() {
  const [route, setRoute] = useState<LatLngTuple[] | null>(null);
  const [startPoint, setStartPoint] = useState<LatLngTuple | null>(null);
  const [endPoint, setEndPoint] = useState<LatLngTuple | null>(null);
  const [routeLength, setRouteLength] = useState(0);
  const [elevationStats, setElevationStats] = useState<ElevationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<RouteAnnotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>(() => {
    try { return JSON.parse(localStorage.getItem("river-route-history-v1") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    if (!historyOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!historyRef.current?.contains(target) && !historyButtonRef.current?.contains(target)) setHistoryOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [historyOpen]);

  const clear = useCallback(() => {
    setRoute(null); setStartPoint(null); setEndPoint(null); setRouteLength(0);
    setElevationStats(null); setAnnotations([]); setError(null); setAnnotationMode(false);
  }, []);

  const build = useCallback(async (start: LatLngTuple, end: LatLngTuple) => {
    setLoading(true); setError(null);
    try {
      const coords = await fetchRiverRoute(start, end);
      const length = calculateRouteLength(coords);
      setRoute(coords); setRouteLength(length);
      setRecentRoutes((items) => {
        const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), start, end, coordinates: coords, length }, ...items].slice(0, 8);
        localStorage.setItem("river-route-history-v1", JSON.stringify(next));
        return next;
      });
      try { setElevationStats(calculateElevationStats(await getElevationData(coords))); }
      catch { setElevationStats(calculateElevationStats(simulateElevationData(coords))); }
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось построить маршрут"); }
    finally { setLoading(false); }
  }, []);

  const handleMapClick = useCallback((coords: LatLngTuple) => {
    if (annotationMode && route) {
      setAnnotations((items) => [...items, { id: crypto.randomUUID(), name: `Точка ${items.length + 1}`, coords }]);
      setAnnotationMode(false); return;
    }
    if (loading) return;
    if (route) return;
    if (!startPoint) {
      setRoute(null); setEndPoint(null); setStartPoint(coords); setError(null); setAnnotations([]);
    } else { setEndPoint(coords); build(startPoint, coords); }
  }, [annotationMode, route, loading, startPoint, build]);

  const loadRecent = useCallback((item: RecentRoute) => {
    setRoute(item.coordinates); setStartPoint(item.start); setEndPoint(item.end);
    setRouteLength(item.length); setElevationStats(null); setAnnotations([]);
    setError(null); setHistoryOpen(false);
  }, []);

  return (
    <main className={styles.app}>
      <header className={styles.hero}>
        <div className={styles.status}>{loading && <i className={styles.spinner} aria-hidden="true" />}<div><strong>{loading ? "Строим маршрут…" : "Речной маршрут"}</strong><span>{loading ? "Поиск может занять несколько минут" : error ? "Попробуйте выбрать точки заново" : !startPoint ? "Нажмите точку старта" : !endPoint ? "Теперь нажмите точку финиша" : route ? "Маршрут готов" : "Нажмите новую точку старта"}</span></div></div>
        <div className={styles.headerActions}>{recentRoutes.length > 0 && <button ref={historyButtonRef} onClick={() => setHistoryOpen((v) => !v)}>Недавние</button>}{(startPoint || route) && <button onClick={clear}>Сбросить</button>}</div>
      </header>
      {historyOpen && <><div className={styles.historyBackdrop} onClick={() => setHistoryOpen(false)} aria-hidden="true" /><section ref={historyRef} className={styles.history}><div className={styles.historyHeader}><strong>Недавние маршруты</strong><button className={styles.historyClose} onClick={() => setHistoryOpen(false)} aria-label="Закрыть недавние маршруты" /></div>{recentRoutes.map((item) => <button key={item.id} onClick={() => loadRecent(item)}><span>{new Date(item.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span><b>{(item.length / 1000).toFixed(1)} км</b></button>)}</section></>}
      {error && <div className={styles.error}>{error}<button onClick={() => setError(null)}>×</button></div>}
      <MapContainer route={route} startPoint={startPoint} endPoint={endPoint} annotations={annotations} onMapClick={handleMapClick} />
      {route && <RouteInfo route={route} routeLength={routeLength} elevationStats={elevationStats} loadingElevation={loading} annotations={annotations} onAnnotationsChange={setAnnotations} annotationMode={annotationMode} onToggleAnnotation={() => setAnnotationMode((v) => !v)} onClear={clear} />}
    </main>
  );
}

export default App;
