import React from "react";
import styles from "./SideMenu.module.scss";

interface SideMenuProps {
  mode: "none" | "search" | "route";
  aiVisible: boolean;
  onToggleMode: (panel: "search" | "route") => void;
  onToggleAI: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  mode,
  aiVisible,
  onToggleMode,
  onToggleAI,
}) => {
  return (
    <div className={styles.menu}>
      <button
        className={`${styles.button} ${mode === "search" ? styles.active : ""}`}
        onClick={() => onToggleMode("search")}
      >
        Поиск
      </button>
      <button
        className={`${styles.button} ${mode === "route" ? styles.active : ""}`}
        onClick={() => onToggleMode("route")}
      >
        Маршрут
      </button>
      <button
        className={`${styles.button} ${aiVisible ? styles.active : ""}`}
        onClick={onToggleAI}
      >
        ИИ анализ
      </button>
    </div>
  );
};

export default SideMenu;
