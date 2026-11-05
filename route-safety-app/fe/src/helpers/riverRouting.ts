import L from "leaflet";
import { LatLngTuple } from "../types";

type Node = { type: "node"; id: number; lat: number; lon: number };
type Way = { type: "way"; id: number; nodes: number[] };
type RiverData = { elements: (Node | Way)[] };
const distance = (a: LatLngTuple, b: LatLngTuple) => L.latLng(...a).distanceTo(L.latLng(...b));

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOverpass(server: string, query: string): Promise<RiverData> {
  const response = await fetch(`${server}?data=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`${server}: HTTP ${response.status}`);
  return response.json();
}

async function fetchOsmMap(bbox: number[]): Promise<RiverData> {
  const [south, west, north, east] = bbox;
  const area = (north - south) * (east - west);
  if (area > 0.05) throw new Error("Район слишком большой для резервного API");
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${west},${south},${east},${north}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OpenStreetMap: HTTP ${response.status}`);
  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  const elements: (Node | Way)[] = [];
  xml.querySelectorAll("node").forEach((item) => elements.push({
    type: "node", id: Number(item.getAttribute("id")), lat: Number(item.getAttribute("lat")), lon: Number(item.getAttribute("lon")),
  }));
  xml.querySelectorAll("way").forEach((item) => {
    const waterway = Array.from(item.querySelectorAll("tag")).some((tag) => tag.getAttribute("k") === "waterway" && /^(river|canal|stream)$/.test(tag.getAttribute("v") || ""));
    if (waterway) elements.push({ type: "way", id: Number(item.getAttribute("id")), nodes: Array.from(item.querySelectorAll("nd")).map((nd) => Number(nd.getAttribute("ref"))) });
  });
  return { elements };
}

export async function fetchRiverRoute(start: LatLngTuple, end: LatLngTuple): Promise<LatLngTuple[]> {
  const directKm = distance(start, end) / 1000;
  if (directKm > 180) throw new Error("Выберите точки ближе 180 км друг к другу");
  const pad = Math.max(0.03, Math.min(0.35, directKm / 250));
  const bbox = [Math.min(start[0], end[0]) - pad, Math.min(start[1], end[1]) - pad, Math.max(start[0], end[0]) + pad, Math.max(start[1], end[1]) + pad];
  const query = `[out:json];way[waterway~"river|canal|stream"](${bbox.join(",")});(._;>;);out body;`;
  let data: RiverData;
  try {
    data = await Promise.any([...OVERPASS_SERVERS.map((server) => fetchOverpass(server, query)), fetchOsmMap(bbox)]);
  } catch {
    throw new Error("Ни один из серверов речных данных не ответил. Попробуйте позже");
  }
  const nodes = new Map<number, LatLngTuple>(); const ways: Way[] = [];
  for (const element of data.elements as (Node | Way)[]) {
    if (element.type === "node") nodes.set(element.id, [element.lat, element.lon]);
    else ways.push(element);
  }
  if (!ways.length) throw new Error("Речные линии в этом районе не найдены");
  const graph = new Map<number, { id: number; weight: number }[]>();
  const add = (a: number, b: number) => { const ca = nodes.get(a); const cb = nodes.get(b); if (ca && cb) graph.set(a, [...(graph.get(a) || []), { id: b, weight: distance(ca, cb) }]); };
  ways.forEach((way) => way.nodes.slice(1).forEach((node, i) => { add(way.nodes[i], node); add(node, way.nodes[i]); }));
  const nearest = (point: LatLngTuple) => {
    let id = -1; let min = Infinity;
    nodes.forEach((coord, nodeId) => { const d = distance(point, coord); if (d < min) { min = d; id = nodeId; } });
    if (min > 4000) throw new Error("Точка дальше 4 км от ближайшей реки"); return id;
  };
  const source = nearest(start); const target = nearest(end);
  const costs = new Map<number, number>([[source, 0]]); const previous = new Map<number, number>(); const queue = [{ id: source, cost: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost); const current = queue.shift()!;
    if (current.cost !== costs.get(current.id)) continue; if (current.id === target) break;
    for (const edge of graph.get(current.id) || []) { const next = current.cost + edge.weight; if (next < (costs.get(edge.id) ?? Infinity)) { costs.set(edge.id, next); previous.set(edge.id, current.id); queue.push({ id: edge.id, cost: next }); } }
  }
  if (!costs.has(target)) throw new Error("Между точками нет связного пути по реке");
  const ids = [target]; while (ids[0] !== source) ids.unshift(previous.get(ids[0])!);
  return ids.map((id) => nodes.get(id)!);
}
