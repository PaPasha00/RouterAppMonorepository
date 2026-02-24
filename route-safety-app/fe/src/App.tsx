import React, { useState, useCallback, useRef } from "react";
import { LatLngTuple, ElevationStats } from "./types";
import MapContainer from "./components/Map/MapContainer";
import RouteAnalyzer from "./components/RouteAnalyzer/RouteAnalyzer";
import RouteInfo from "./components/RouteInfo/RouteInfo";
import {
  formatLength,
  calculateRouteLength,
  calculateElevationStats,
} from "./helpers/routeCalculations";
import {
  getElevationData,
  simulateElevationData,
} from "./helpers/elevationData";
import RouteBuilder from "./components/RouteBuilder/RouteBuilder";
import SideMenu from "./components/Menu/SideMenu";
import styles from "./App.module.scss";

function App() {
  const [route, setRoute] = useState<LatLngTuple[] | null>(null);
  const [drawEnabled, setDrawEnabled] = useState(true);
  const [routeLength, setRouteLength] = useState<number>(0);
  const [elevationData, setElevationData] = useState<number[] | null>(null);
  const [elevationStats, setElevationStats] = useState<ElevationStats | null>(
    null
  );
  const [loadingElevation, setLoadingElevation] = useState(false);

  const [mode, setMode] = useState<"none" | "search" | "route">("none");
  const [aiVisible, setAiVisible] = useState(false);

  const [pickMode, setPickMode] = useState<"start" | "end" | null>(null);
  const routeBuilderRef = useRef<{
    setStart: (v: string) => void;
    setEnd: (v: string) => void;
  } | null>(null);

  const [startPoint, setStartPoint] = useState<LatLngTuple | null>(null);
  const [endPoint, setEndPoint] = useState<LatLngTuple | null>(null);

  const handleRouteCreated = useCallback(
    (
      coords: LatLngTuple[],
      length: number,
      elevations: number[],
      stats: ElevationStats
    ) => {
      setRoute(coords);
      setRouteLength(length);
      setElevationData(elevations);
      setElevationStats(stats);
      setDrawEnabled(false);
    },
    []
  );

  const handleRouteCleared = useCallback(() => {
    setRoute(null);
    setRouteLength(0);
    setElevationData(null);
    setElevationStats(null);
    setDrawEnabled(true);
  }, []);

  const handleRouteBuilt = useCallback(async (coords: LatLngTuple[]) => {
    setRoute(coords);
    const length = calculateRouteLength(coords);
    setRouteLength(length);
    setLoadingElevation(true);
    try {
      const elevations = await getElevationData(coords);
      const stats = calculateElevationStats(elevations);
      setElevationData(elevations);
      setElevationStats(stats);
    } catch (e) {
      const simulated = simulateElevationData(coords);
      const stats = calculateElevationStats(simulated);
      setElevationData(simulated);
      setElevationStats(stats);
    } finally {
      setLoadingElevation(false);
      setDrawEnabled(false);
    }
  }, []);

  const handleRequestPick = useCallback((which: "start" | "end") => {
    setPickMode(which);
  }, []);

  const handlePick = useCallback(
    (coords: LatLngTuple) => {
      const text = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
      if (pickMode === "start") {
        routeBuilderRef.current?.setStart(text);
        setStartPoint(coords);
      } else if (pickMode === "end") {
        routeBuilderRef.current?.setEnd(text);
        setEndPoint(coords);
      }
      setPickMode(null);
    },
    [pickMode]
  );

  const handlePointChanged = useCallback(
    (which: "start" | "end", coords: LatLngTuple | null) => {
      if (which === "start") setStartPoint(coords);
      else setEndPoint(coords);
    },
    []
  );

  const handleToggleMode = useCallback((panel: "search" | "route") => {
    setMode((prev) => (prev === panel ? "none" : panel));
  }, []);

  const handleToggleAI = useCallback(() => {
    setAiVisible((v) => !v);
  }, []);

  return (
    <div className={styles.app}>
      <SideMenu
        mode={mode}
        aiVisible={aiVisible}
        onToggleMode={handleToggleMode}
        onToggleAI={handleToggleAI}
      />

      {aiVisible && (
        <RouteAnalyzer
          route={route}
          length={Number(formatLength(routeLength).replace(" км", ""))}
          elevationGain={elevationStats?.totalGain || 0}
          elevationData={elevationData}
        />
      )}

      <MapContainer
        route={route}
        onRouteCreated={handleRouteCreated}
        onRouteCleared={handleRouteCleared}
        drawEnabled={drawEnabled}
        pickMode={pickMode}
        onPick={handlePick}
        startPoint={startPoint}
        endPoint={endPoint}
        showSearch={mode === "search"}
      />

      {mode === "route" && (
        <RouteBuilder
          onRouteBuilt={handleRouteBuilt}
          onRequestPick={handleRequestPick}
          onPointChanged={handlePointChanged}
          ref={routeBuilderRef as any}
        />
      )}

      {route && (
        <RouteInfo
          route={route}
          routeLength={routeLength}
          elevationStats={elevationStats}
          loadingElevation={loadingElevation}
          onClear={handleRouteCleared}
        />
      )}
    </div>
  );
}

export default App;
