import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer as LeafletMap, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@tomickigrzegorz/leaflet-rotate";
import "@tomickigrzegorz/leaflet-rotate/css";
import { LatLngTuple, RouteAnnotation } from "../../types";
import SearchBox from "../Search/SearchBox";
import styles from "./MapContainer.module.scss";

const pin = (label: string, kind = "note") => L.divIcon({ className: "", iconSize: [34, 42], iconAnchor: [17, 38], html: `<div class="${styles.pin} ${styles[kind] || ""}">${label}</div>` });
const badge = (label: string) => L.divIcon({ className: "", iconSize: [56, 22], iconAnchor: [28, 11], html: `<div class="${styles.kmBadge}">${label}</div>` });
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
const annotationIcon = (name: string) => L.divIcon({ className: "", iconSize: [220, 38], iconAnchor: [12, 19], popupAnchor: [0, -20], html: `<div class="${styles.annotationMarker}"><span class="${styles.annotationDot}"></span><span class="${styles.annotationLabel}">${escapeHtml(name)}</span></div>` });

const TILE_PROVIDERS = {
  osm: { name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors" },
  topo: { name: "OpenTopoMap", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap, SRTM | OpenTopoMap" },
  satellite: { name: "Esri · Спутник", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri" },
  dg: { name: "2ГИС", url: "https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1", attribution: "&copy; 2ГИС" },
} as const;
type TileProvider = keyof typeof TILE_PROVIDERS;

function Controls({ searchOpen, onToggleSearch }: { searchOpen: boolean; onToggleSearch: () => void }) {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [bearing, setBearing] = useState(0);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [location, setLocation] = useState<{ center: LatLngTuple; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
  }, []);
  useEffect(() => {
    const handleRotate = () => setBearing(Math.round(map.getBearing()));
    const handleFound = (event: L.LocationEvent) => {
      setLocation({ center: [event.latlng.lat, event.latlng.lng], accuracy: event.accuracy });
      setLocationError("");
      setLocating(false);
    };
    const handleError = (event: L.ErrorEvent) => {
      const messages: Record<number, string> = {
        1: "Разрешите доступ к геопозиции в настройках браузера",
        2: "Геопозиция сейчас недоступна. Проверьте GPS и сеть",
        3: "Не удалось определить местоположение. Попробуйте ещё раз",
      };
      setLocationError(messages[event.code] || "Не удалось определить геопозицию");
      setLocating(false);
    };
    map.on("rotate", handleRotate);
    map.on("locationfound", handleFound);
    map.on("locationerror", handleError);
    return () => {
      map.off("rotate", handleRotate);
      map.off("locationfound", handleFound);
      map.off("locationerror", handleError);
    };
  }, [map]);
  const locate = () => {
    setLocationError("");
    setRotateOpen(false);
    setLocating(true);
    map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true, timeout: 10000 });
  };
  return <>
    <div ref={containerRef} className={styles.controls}>
      <button onClick={onToggleSearch} className={searchOpen ? styles.activeControl : ""} title="Поиск мест" aria-label="Поиск мест">🔍</button>
      <button onClick={() => map.zoomIn()} aria-label="Приблизить">+</button>
      <button onClick={() => map.zoomOut()} aria-label="Отдалить">−</button>
      <button onClick={locate} title="Моё место" aria-label="Определить моё место" aria-busy={locating} className={location ? styles.activeControl : locating ? styles.locatingControl : ""}>{locating ? "…" : "◎"}</button>
      <button onClick={() => setRotateOpen((value) => !value)} title="Повернуть карту" aria-label="Повернуть карту" aria-expanded={rotateOpen} className={bearing !== 0 ? styles.activeControl : ""} style={{ transform: `rotate(${-bearing}deg)` }}>🧭</button>
      {rotateOpen && <div className={styles.rotatePanel}>
        <div><strong>Поворот карты</strong><span>{bearing}°</span></div>
        <input type="range" min="0" max="359" value={bearing} onChange={(event) => map.setBearing(Number(event.target.value))} aria-label="Угол поворота карты" />
        <button className={styles.northButton} onClick={() => map.setBearing(0)}>Сбросить на север</button>
      </div>}
      {locationError && <div className={styles.locationError} role="alert">{locationError}</div>}
    </div>
    {location && <><Circle center={location.center} radius={location.accuracy} pathOptions={{ color: "#087f72", fillColor: "#71d8c9", fillOpacity: .14, weight: 1 }} /><CircleMarker center={location.center} radius={7} pathOptions={{ color: "#fff", fillColor: "#087f72", fillOpacity: 1, weight: 3 }}><Popup>Вы здесь<br />Точность: до {Math.round(location.accuracy)} м</Popup></CircleMarker></>}
  </>;
}

function Events({ onClick, onZoom }: { onClick: (p: LatLngTuple) => void; onZoom: (z: number) => void }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]), zoomend: (e) => onZoom(e.target.getZoom()) }); return null;
}

function FitRoute({ route }: { route: LatLngTuple[] | null }) {
  const map = useMap();
  useEffect(() => { if (route?.length) map.fitBounds(L.latLngBounds(route), { padding: [45, 45] }); }, [route, map]); return null;
}

function GoToSearch({ point }: { point: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => { if (point) map.setView(point, 14); }, [point, map]);
  return null;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [map]);
  return null;
}

function routeMarkers(route: LatLngTuple[], zoom: number) {
  const interval = zoom >= 14 ? 1 : zoom >= 11 ? 5 : zoom >= 9 ? 10 : 25;
  const result: { coords: LatLngTuple; km: number }[] = []; let travelled = 0; let next = interval * 1000;
  for (let i = 1; i < route.length; i++) {
    const a = L.latLng(...route[i - 1]); const b = L.latLng(...route[i]); const segment = a.distanceTo(b);
    while (travelled + segment >= next) { const ratio = (next - travelled) / segment; result.push({ coords: [a.lat + (b.lat - a.lat) * ratio, a.lng + (b.lng - a.lng) * ratio], km: next / 1000 }); next += interval * 1000; }
    travelled += segment;
  }
  return result;
}

export default function MapContainer({ route, startPoint, endPoint, annotations, onMapClick }: { route: LatLngTuple[] | null; startPoint: LatLngTuple | null; endPoint: LatLngTuple | null; annotations: RouteAnnotation[]; onMapClick: (p: LatLngTuple) => void }) {
  const [zoom, setZoom] = useState(10);
  const [provider, setProvider] = useState<TileProvider>("osm");
  const [layersOpen, setLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPoint, setSearchPoint] = useState<{ coords: LatLngTuple; name: string } | null>(null);
  const kms = useMemo(() => route ? routeMarkers(route, zoom) : [], [route, zoom]);
  const tiles = TILE_PROVIDERS[provider];
  useEffect(() => {
    if (!layersOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!layersRef.current?.contains(event.target as Node)) setLayersOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [layersOpen]);
  return <div className={styles.mapContainer}>
    {searchOpen && <SearchBox onClose={() => setSearchOpen(false)} onLocationFound={(coords, name) => { setSearchPoint({ coords, name: name || "Найденное место" }); setSearchOpen(false); }} />}
    <div ref={layersRef} className={styles.layers} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}><button className={styles.layersButton} onClick={() => setLayersOpen((v) => !v)} aria-expanded={layersOpen}>▦ <span>Слои</span></button>{layersOpen && <div className={styles.layersMenu}>{(Object.entries(TILE_PROVIDERS) as [TileProvider, typeof tiles][]).map(([key, item]) => <button key={key} className={key === provider ? styles.selectedLayer : ""} onClick={() => { setProvider(key); setLayersOpen(false); }}>{item.name}</button>)}</div>}</div>
    <LeafletMap center={[56.84, 60.61]} zoom={10} className={styles.map} zoomControl={false} preferCanvas rotate touchRotate dragRotate shiftKeyRotate rotateControl={false}>
    <TileLayer key={provider} attribution={tiles.attribution} url={tiles.url} />
    <ResizeMap /><Events onClick={onMapClick} onZoom={setZoom} /><Controls searchOpen={searchOpen} onToggleSearch={() => setSearchOpen((v) => !v)} /><FitRoute route={route} /><GoToSearch point={searchPoint?.coords || null} />
    {route && <><Polyline positions={route} pathOptions={{ color: "#ffffff", weight: 9, opacity: .9 }} /><Polyline positions={route} pathOptions={{ color: "#087f72", weight: 5 }} /></>}
    {kms.map((p) => <Marker key={p.km} position={p.coords} icon={badge(`${p.km} км`)} interactive={false} />)}
    {startPoint && <Marker position={startPoint} icon={pin("А", "start")}><Popup>Старт</Popup></Marker>}
    {endPoint && <Marker position={endPoint} icon={pin("Б", "end")}><Popup>Финиш</Popup></Marker>}
    {annotations.map((p) => <Marker key={p.id} position={p.coords} icon={annotationIcon(p.name)}><Popup><strong>{p.name}</strong><br />{p.coords.map((n) => n.toFixed(5)).join(", ")}</Popup></Marker>)}
    {searchPoint && <Marker position={searchPoint.coords} icon={pin("⌕", "search")}><Popup><strong>{searchPoint.name}</strong></Popup></Marker>}
  </LeafletMap></div>;
}
