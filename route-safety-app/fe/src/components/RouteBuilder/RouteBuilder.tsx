import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { LatLngTuple } from "../../types";
import { fetchOsrmRoute } from "../../helpers/api";
import styles from "./RouteBuilder.module.scss";

interface RouteBuilderProps {
  onRouteBuilt: (coords: LatLngTuple[]) => void;
  onRequestPick?: (which: "start" | "end") => void;
  onPointChanged?: (which: "start" | "end", coords: LatLngTuple | null) => void;
}

export interface RouteBuilderRef {
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
}

type Profile = "foot" | "bike" | "car";

function parseCoord(input: string): LatLngTuple | null {
  const parts = input
    .split(/[ ,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const RouteBuilder = forwardRef<RouteBuilderRef, RouteBuilderProps>(
  ({ onRouteBuilt, onRequestPick, onPointChanged }, ref) => {
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [profile, setProfile] = useState<Profile>("foot");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [startSuggestions, setStartSuggestions] = useState<Suggestion[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<Suggestion[]>([]);
    const suggRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        setStart: (v: string) => {
          setStart(v);
          const c = parseCoord(v);
          onPointChanged?.("start", c);
        },
        setEnd: (v: string) => {
          setEnd(v);
          const c = parseCoord(v);
          onPointChanged?.("end", c);
        },
      }),
      [onPointChanged]
    );

    useEffect(() => {
      const onDocClick = (e: MouseEvent) => {
        if (suggRef.current && !suggRef.current.contains(e.target as Node)) {
          setStartSuggestions([]);
          setEndSuggestions([]);
        }
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const fetchSuggestions = useCallback(
      async (query: string, set: (s: Suggestion[]) => void) => {
        if (!query || /[-+]?\d+\.?\d*[ ,;]+[-+]?\d+\.?\d*/.test(query)) {
          // looks like coords
          set([]);
          return;
        }
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1&accept-language=ru`;
          const res = await fetch(url);
          const data: Suggestion[] = await res.json();
          set(data);
        } catch {
          set([]);
        }
      },
      []
    );

    const applySuggestion = (s: Suggestion, which: "start" | "end") => {
      const val = `${parseFloat(s.lat).toFixed(6)}, ${parseFloat(s.lon).toFixed(
        6
      )}`;
      if (which === "start") {
        setStart(val);
        onPointChanged?.("start", [parseFloat(s.lat), parseFloat(s.lon)]);
        setStartSuggestions([]);
      } else {
        setEnd(val);
        onPointChanged?.("end", [parseFloat(s.lat), parseFloat(s.lon)]);
        setEndSuggestions([]);
      }
    };

    const handleBuild = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const s = parseCoord(start);
        const ept = parseCoord(end);
        if (!s || !ept) {
          setError("Введите координаты в формате: широта, долгота");
          return;
        }
        try {
          setLoading(true);
          const coords = await fetchOsrmRoute(s, ept, profile);
          if (!coords || coords.length < 2) {
            setError("Маршрут не найден");
            return;
          }
          onRouteBuilt(coords as LatLngTuple[]);
        } catch (err: any) {
          setError(err.message || "Не удалось построить маршрут");
        } finally {
          setLoading(false);
        }
      },
      [start, end, profile, onRouteBuilt]
    );

    return (
      <div className={styles.container} ref={suggRef}>
        <form onSubmit={handleBuild} className={styles.form}>
          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder="Старт: широта, долгота или адрес"
              value={start}
              onChange={(e) => {
                const v = e.target.value;
                setStart(v);
                const c = parseCoord(v);
                onPointChanged?.("start", c);
                fetchSuggestions(v, setStartSuggestions);
              }}
            />
            <button
              type="button"
              className={styles.iconButton}
              title="Выбрать старт на карте"
              onClick={() => onRequestPick?.("start")}
            >
              📍
            </button>
            <input
              className={styles.input}
              placeholder="Финиш: широта, долгота или адрес"
              value={end}
              onChange={(e) => {
                const v = e.target.value;
                setEnd(v);
                const c = parseCoord(v);
                onPointChanged?.("end", c);
                fetchSuggestions(v, setEndSuggestions);
              }}
            />
            <button
              type="button"
              className={styles.iconButton}
              title="Выбрать финиш на карте"
              onClick={() => onRequestPick?.("end")}
            >
              📍
            </button>
            <select
              className={styles.input}
              value={profile}
              onChange={(e) => setProfile(e.target.value as Profile)}
            >
              <option value="foot">Пешком</option>
              <option value="bike">Велосипед</option>
              <option value="car">Авто</option>
            </select>
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Строим..." : "Построить"}
            </button>
          </div>
          {startSuggestions.length > 0 && (
            <div className={styles.dropdown}>
              {startSuggestions.map((s, i) => (
                <div
                  key={`s-${i}`}
                  className={styles.item}
                  onClick={() => applySuggestion(s, "start")}
                >
                  {s.display_name}
                </div>
              ))}
            </div>
          )}
          {endSuggestions.length > 0 && (
            <div className={styles.dropdown}>
              {endSuggestions.map((s, i) => (
                <div
                  key={`e-${i}`}
                  className={styles.item}
                  onClick={() => applySuggestion(s, "end")}
                >
                  {s.display_name}
                </div>
              ))}
            </div>
          )}
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.hint}>
            Пример: 55.7558, 37.6176 или "Красная площадь"
          </div>
        </form>
      </div>
    );
  }
);

export default RouteBuilder;
