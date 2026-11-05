import React, { useState, useRef } from "react";
import { LatLngTuple } from "../../types";
import styles from "./SearchBox.module.scss";

interface SearchBoxProps {
  onLocationFound: (coords: LatLngTuple, name?: string) => void;
  onClose: () => void;
}

interface SearchResult {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onLocationFound, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Обработка клика вне компонента для скрытия результатов
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const searchByQuery = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Используем Nominatim API для поиска
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&accept-language=ru`
      );
      const results: SearchResult[] = await response.json();
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Ошибка поиска:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchByCoordinates = (lat: string, lon: string) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      alert("Пожалуйста, введите корректные координаты");
      return;
    }

    if (latNum < -90 || latNum > 90) {
      alert("Широта должна быть от -90 до 90");
      return;
    }

    if (lonNum < -180 || lonNum > 180) {
      alert("Долгота должна быть от -180 до 180");
      return;
    }

    onLocationFound([latNum, lonNum], `Координаты: ${lat}, ${lon}`);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchByQuery(searchQuery);
  };

  const handleResultClick = (result: SearchResult) => {
    const coords: LatLngTuple = [
      parseFloat(result.lat),
      parseFloat(result.lon),
    ];
    onLocationFound(coords, result.display_name);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleCoordinateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const [lat, lon] = searchQuery.split(/[,\s]+/).map((s) => s.trim());
    if (lat && lon) {
      searchByCoordinates(lat, lon);
    } else {
      alert(
        "Введите координаты в формате: широта, долгота (например: 55.7558, 37.6176)"
      );
    }
  };

  const isCoordinateInput = /^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/.test(searchQuery);

  return (
    <div className={styles.searchContainer} ref={searchRef} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <form
        onSubmit={isCoordinateInput ? handleCoordinateSearch : handleSearch}
      >
        <div className={styles.searchInputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Найти место или координаты"
            aria-label="Поиск места на карте"
            className={styles.searchInput}
          />
          <button
            type="submit"
            className={styles.searchButton}
            disabled={isSearching}
          >
            {isSearching ? "..." : "🔍"}
          </button>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Закрыть поиск">×</button>
        </div>
      </form>

      {showResults && searchResults.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((result, index) => (
            <div
              key={index}
              className={styles.searchResult}
              onClick={() => handleResultClick(result)}
            >
              <div className={styles.resultName}>{result.display_name}</div>
              <div className={styles.resultType}>{result.type}</div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && !isSearching && (
        <div className={styles.searchResults}>
          <div className={styles.noResults}>Места не найдены</div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
