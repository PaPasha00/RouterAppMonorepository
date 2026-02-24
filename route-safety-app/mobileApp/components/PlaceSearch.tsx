import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";

export interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface PlaceSearchProps {
  onSelect: (place: PlaceResult) => void;
  visible?: boolean;
}

export interface PlaceSearchHandle {
  blur: () => void;
}

const PlaceSearch = forwardRef<PlaceSearchHandle, PlaceSearchProps>(
  function PlaceSearch({ onSelect, visible = true }, ref) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(
      ref,
      () => ({
        blur: () => {
          setFocused(false);
          setResults([]);
          inputRef.current?.blur();
        },
      }),
      []
    );

    const search = useCallback(async (q: string) => {
      if (!q || q.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        controllerRef.current?.abort();
        const ctrl = new AbortController();
        controllerRef.current = ctrl;
        setLoading(true);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&limit=8&addressdetails=1&accept-language=ru`,
          { signal: ctrl.signal, headers: { "User-Agent": "route-safety-app" } }
        );
        if (!resp.ok) throw new Error("search failed");
        const data = (await resp.json()) as PlaceResult[];
        setResults(data);
      } catch (e) {
        if ((e as any).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      const id = setTimeout(() => search(query), 350);
      return () => clearTimeout(id);
    }, [query, search]);

    const renderItem = useCallback(
      ({ item }: { item: PlaceResult }) => (
        <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
          <Text style={styles.itemText} numberOfLines={2}>
            {item.display_name}
          </Text>
        </TouchableOpacity>
      ),
      [onSelect]
    );

    if (!visible) return null;

    return (
      <View style={styles.container}>
        <BlurView intensity={40} tint="dark" style={[styles.searchBox]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Поиск места (город, адрес, объект)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            placeholderTextColor="#aaa"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </BlurView>
        {results.length > 0 && (
          <View style={styles.results}>
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={results}
              keyExtractor={(i) => i.place_id}
              renderItem={renderItem}
            />
          </View>
        )}
      </View>
    );
  }
);

export default PlaceSearch;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 66,
    left: 30,
    right: 30,
    zIndex: 1000,
  },
  searchBox: {
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: "hidden",
  },
  input: {
    fontSize: 16,
    color: "#fff",
  },
  results: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 240,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: "#eee",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
});
