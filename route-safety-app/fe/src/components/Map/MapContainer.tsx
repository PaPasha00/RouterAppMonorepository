import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  useMapEvents,
  Polyline,
  useMap,
  Marker,
  Popup,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LatLngTuple } from "../../types";
import {
  calculateRouteLength,
  formatLength,
} from "../../helpers/routeCalculations";
import {
  getElevationData,
  simulateElevationData,
} from "../../helpers/elevationData";
import { calculateElevationStats } from "../../helpers/routeCalculations";
import LeafletDraw from "./LeafletDraw";
import SearchBox from "../Search/SearchBox";
// @ts-ignore
import styles from "./MapContainer.module.scss";

// Исправляем иконки маркеров
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const AnyMarker: any = Marker as any;
const AnyCircle: any = Circle as any;

interface AppMapContainerProps {
  route: LatLngTuple[] | null;
  onRouteCreated: (
    route: LatLngTuple[],
    length: number,
    elevationData: number[],
    elevationStats: any
  ) => void;
  onRouteCleared: () => void;
  drawEnabled: boolean;
  pickMode?: "start" | "end" | null;
  onPick?: (coords: LatLngTuple) => void;
  startPoint?: LatLngTuple | null;
  endPoint?: LatLngTuple | null;
  showSearch?: boolean;
}

function createNumberIcon(num: number, type: "start" | "end") {
  const innerClass =
    type === "end" ? styles.numMarkerInnerEnd : styles.numMarkerInner;
  const html = `<div class=\"${styles.numMarker}\"><div class=\"${innerClass}\">${num}</div></div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createCurrentIcon() {
  const html = `<div style=\"width:18px;height:18px;border-radius:9px;background:#2ecc71;border:2px solid #fff;box-shadow:0 0 0 2px rgba(46,204,113,0.5);\"></div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

function SearchHandler({
  searchLocation,
  onLocationFound,
}: {
  searchLocation: LatLngTuple | null;
  onLocationFound: (coords: LatLngTuple, name?: string) => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (searchLocation) {
      map.setView(searchLocation, 15);
    }
  }, [searchLocation, map]);

  return null;
}

function ClickHandler({
  pickMode,
  onPick,
}: {
  pickMode?: "start" | "end" | null;
  onPick?: (coords: LatLngTuple) => void;
}) {
  useMapEvents({
    click(e) {
      if (pickMode && onPick) {
        onPick([e.latlng.lat, e.latlng.lng]);
      }
      console.log("Клик на карте:", e.latlng);
    },
  });
  return null;
}

function ZoomButtons({ currentPos }: { currentPos?: LatLngTuple | null }) {
  const map = useMap();
  const zoomIn = () => map.setZoom(map.getZoom() + 1);
  const zoomOut = () => map.setZoom(map.getZoom() - 1);
  const locate = () => {
    console.log("[Locate] Clicked. currentPos=", currentPos);
    if (currentPos) map.setView(currentPos as any, Math.max(map.getZoom(), 15));
  };
  return (
    <div className={styles.zoomButtons}>
      <button className={styles.zoomBtn} onClick={zoomIn}>
        +
      </button>
      <button className={styles.zoomBtn} onClick={zoomOut}>
        -
      </button>
      <button className={styles.zoomBtn} onClick={locate}>
        🎯
      </button>
    </div>
  );
}

function DrawEventHandler({
  onCreated,
  onDeleted,
}: {
  onCreated: (e: L.DrawEvents.Created) => void;
  onDeleted: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleCreated = (e: L.DrawEvents.Created) => {
      onCreated(e);
    };

    const handleDeleted = () => {
      onDeleted();
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED, handleDeleted);
    };
  }, [map, onCreated, onDeleted]);

  return null;
}

const MapContainer: React.FC<AppMapContainerProps> = ({
  route,
  onRouteCreated,
  onRouteCleared,
  drawEnabled,
  pickMode,
  onPick,
  startPoint,
  endPoint,
  showSearch,
}) => {
  const [searchLocation, setSearchLocation] = useState<LatLngTuple | null>(
    null
  );
  const [searchMarker, setSearchMarker] = useState<{
    coords: LatLngTuple;
    name: string;
  } | null>(null);

  const [currentPos, setCurrentPos] = useState<LatLngTuple | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("[Geolocation] not supported by browser");
      return;
    }
    console.log("[Geolocation] requesting position...");
    const success = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const coords: LatLngTuple = [latitude, longitude];
      console.log("[Geolocation] success:", { latitude, longitude, accuracy });
      setCurrentPos(coords);
      setAccuracy(accuracy || null);
    };
    const error = (err: GeolocationPositionError) => {
      console.error("[Geolocation] error:", {
        code: err.code,
        message: err.message,
      });
    };
    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    });
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log("[Geolocation] watch update:", {
          latitude,
          longitude,
          accuracy,
        });
        success(pos);
      },
      error,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (currentPos) {
      console.log("[Render] currentPos marker:", { currentPos, accuracy });
    }
  }, [currentPos, accuracy]);

  function AutoCenter() {
    const map = useMap();
    useEffect(() => {
      if (currentPos && !hasCenteredRef.current) {
        console.log("[AutoCenter] center map to", currentPos);
        map.setView(currentPos as any, Math.max(map.getZoom(), 14));
        hasCenteredRef.current = true;
      }
    }, [currentPos, map]);
    return null;
  }

  const onCreated = useCallback(
    async (e: L.DrawEvents.Created) => {
      const { layerType, layer } = e;

      if (layerType === "polyline") {
        const polyline = layer as L.Polyline;
        const latLngs = polyline.getLatLngs();

        const coords: LatLngTuple[] = latLngs.map((latLng: any) => [
          latLng.lat,
          latLng.lng,
        ]) as LatLngTuple[];

        const length = calculateRouteLength(coords);

        try {
          const elevations = await getElevationData(coords);
          const stats = calculateElevationStats(elevations);
          onRouteCreated(coords, length, elevations, stats);
        } catch (error) {
          const simulatedElevations = simulateElevationData(coords);
          const stats = calculateElevationStats(simulatedElevations);
          onRouteCreated(coords, length, simulatedElevations, stats);
        }
      }
    },
    [onRouteCreated]
  );

  const drawOptions: L.Control.DrawOptions = {
    position: "topright",
    draw: {
      polyline: {
        shapeOptions: {
          color: "#3388ff",
          weight: 4,
        },
        metric: true,
        showLength: true,
      },
      polygon: false,
      circle: false,
      rectangle: false,
      marker: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: new L.FeatureGroup(),
      remove: true,
    },
  };

  const MapContainerAny: any = LeafletMapContainer as any;

  return (
    <div className={styles.mapContainer}>
      {showSearch && (
        <SearchBox onLocationFound={(coords) => setSearchLocation(coords)} />
      )}

      <MapContainerAny
        center={[55.75, 37.62]}
        zoom={10}
        className={styles.map}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TileLayer url="https://tile.openstreetmap.ru/{z}/{x}/{y}.png" />

        <ZoomButtons currentPos={currentPos} />
        <AutoCenter />

        {route && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#3388ff", weight: 4 }}
          />
        )}

        {startPoint && (
          <AnyMarker position={startPoint} icon={createNumberIcon(1, "start")}>
            <Popup>
              <div>
                <strong>Старт</strong>
                <br />
                {startPoint[0].toFixed(6)}, {startPoint[1].toFixed(6)}
              </div>
            </Popup>
          </AnyMarker>
        )}
        {endPoint && (
          <AnyMarker position={endPoint} icon={createNumberIcon(2, "end")}>
            <Popup>
              <div>
                <strong>Финиш</strong>
                <br />
                {endPoint[0].toFixed(6)}, {endPoint[1].toFixed(6)}
              </div>
            </Popup>
          </AnyMarker>
        )}

        {currentPos && (
          <>
            <AnyMarker position={currentPos} icon={createCurrentIcon()}>
              <Popup>
                <div>
                  <strong>Мое местоположение</strong>
                  <br />
                  {currentPos[0].toFixed(6)}, {currentPos[1].toFixed(6)}
                </div>
              </Popup>
            </AnyMarker>
            {accuracy && (
              <AnyCircle
                center={currentPos}
                radius={accuracy}
                pathOptions={{
                  color: "#2ecc71",
                  opacity: 0.3,
                  fillOpacity: 0.1,
                }}
              />
            )}
          </>
        )}

        {searchMarker && (
          <AnyMarker position={searchMarker.coords}>
            <Popup>
              <div>
                <strong>{searchMarker.name}</strong>
                <br />
                Координаты: {searchMarker.coords[0].toFixed(6)},{" "}
                {searchMarker.coords[1].toFixed(6)}
              </div>
            </Popup>
          </AnyMarker>
        )}

        {drawEnabled && <LeafletDraw {...drawOptions} />}

        <DrawEventHandler onCreated={onCreated} onDeleted={onRouteCleared} />
        <SearchHandler
          searchLocation={searchLocation}
          onLocationFound={(coords) => setSearchLocation(coords)}
        />
        <ClickHandler pickMode={pickMode} onPick={onPick} />
      </MapContainerAny>
    </div>
  );
};

export default MapContainer;
