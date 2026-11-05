import { ElevationStats, LatLngTuple, RouteAnnotation } from "../../types";
import { exportRoute, ExportFormat } from "../../helpers/exportRoute";
import { formatLength } from "../../helpers/routeCalculations";
import styles from "./RouteInfo.module.scss";

export default function RouteInfo({ route, routeLength, elevationStats, annotations, onAnnotationsChange, annotationMode, onToggleAnnotation, onClear }: { route: LatLngTuple[]; routeLength: number; elevationStats: ElevationStats | null; loadingElevation: boolean; annotations: RouteAnnotation[]; onAnnotationsChange: (items: RouteAnnotation[]) => void; annotationMode: boolean; onToggleAnnotation: () => void; onClear: () => void }) {
  const rename = (id: string, name: string) => onAnnotationsChange(annotations.map((p) => p.id === id ? { ...p, name } : p));
  return <section className={styles.panel}>
    <div className={styles.summary}><div><span>Общая длина</span><strong>{formatLength(routeLength)}</strong></div><div><span>Точек трека</span><strong>{route.length}</strong></div>{elevationStats && <div><span>Перепад</span><strong>{elevationStats.totalLoss} м</strong></div>}</div>
    <div className={styles.actions}><button className={annotationMode ? styles.active : ""} onClick={onToggleAnnotation}>{annotationMode ? "Нажмите на карту…" : "+ Подписать точку"}</button><div className={styles.exports}>{(["gpx", "kml", "geojson", "csv"] as ExportFormat[]).map((f) => <button key={f} onClick={() => exportRoute(f, route, annotations)}>{f.toUpperCase()}</button>)}</div></div>
    {annotations.length > 0 && <div className={styles.labels}>{annotations.map((p) => <div key={p.id}><input aria-label="Название точки" value={p.name} onChange={(e) => rename(p.id, e.target.value)} /><button onClick={() => onAnnotationsChange(annotations.filter((x) => x.id !== p.id))}>×</button></div>)}</div>}
    <button className={styles.clear} onClick={onClear}>Очистить маршрут</button>
  </section>;
}
