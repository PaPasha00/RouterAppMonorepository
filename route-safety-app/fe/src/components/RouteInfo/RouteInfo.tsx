import React, { useEffect } from "react";
import { LatLngTuple, ElevationStats } from "../../types";
import { formatLength } from "../../helpers/routeCalculations";
import { useDraggable } from "../../hooks/useDraggable";
import styles from "./RouteInfo.module.scss";

interface RouteInfoProps {
  route: LatLngTuple[];
  routeLength: number;
  elevationStats: ElevationStats | null;
  loadingElevation: boolean;
  onClear: () => void;
}

const RouteInfo: React.FC<RouteInfoProps> = ({
  route,
  routeLength,
  elevationStats,
  loadingElevation,
  onClear,
}) => {
  const draggable = useDraggable();

  useEffect(() => {
    // Активируем перетаскивание
    draggable.enableDragging();

    return () => {
      draggable.disableDragging();
    };
  }, [draggable]);

  return (
    <div ref={draggable.elementRef} className={styles.routeInfo}>
      <h4 className={styles.title} onMouseDown={draggable.handleMouseDown}>
        📈 Маршрут нарисован
      </h4>

      <div className={styles.stats}>
        <p className={styles.stat}>
          <strong>Точек:</strong> {route.length}
        </p>
        <p className={styles.stat}>
          <strong>Длина:</strong> {formatLength(routeLength)}
        </p>

        {loadingElevation && (
          <p className={styles.loading}>⏳ Загрузка данных о высотах...</p>
        )}

        {elevationStats && (
          <>
            <p className={styles.stat}>
              <strong>Набор высоты:</strong> {elevationStats.totalGain} м
            </p>
            <p className={styles.stat}>
              <strong>Спуск:</strong> {elevationStats.totalLoss} м
            </p>
            <p className={styles.stat}>
              <strong>Мин. высота:</strong> {elevationStats.minElevation} м
            </p>
            <p className={styles.stat}>
              <strong>Макс. высота:</strong> {elevationStats.maxElevation} м
            </p>
            <p className={styles.stat}>
              <strong>Ср. высота:</strong> {elevationStats.avgElevation} м
            </p>
          </>
        )}
      </div>

      <div className={styles.coordinates}>
        <p className={styles.coordinatesTitle}>
          <strong>Координаты:</strong>
        </p>
        <div className={styles.coordinatesList}>
          {route.map((coord, index) => (
            <div key={index} className={styles.coordinate}>
              {index + 1}. {coord[0].toFixed(6)}, {coord[1].toFixed(6)}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onClear} className={styles.clearButton}>
        Очистить маршрут
      </button>
    </div>
  );
};

export default RouteInfo;
