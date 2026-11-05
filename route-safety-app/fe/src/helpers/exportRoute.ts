import { LatLngTuple, RouteAnnotation } from "../types";

export type ExportFormat = "gpx" | "kml" | "geojson" | "csv";
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
const save = (filename: string, type: string, content: string) => { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); };

export function exportRoute(format: ExportFormat, route: LatLngTuple[], annotations: RouteAnnotation[]) {
  const name = `river-route-${new Date().toISOString().slice(0, 10)}`;
  if (format === "gpx") {
    const points = route.map(([lat, lon]) => `<trkpt lat="${lat}" lon="${lon}"/>`).join("");
    const marks = annotations.map((p) => `<wpt lat="${p.coords[0]}" lon="${p.coords[1]}"><name>${escapeXml(p.name)}</name></wpt>`).join("");
    save(`${name}.gpx`, "application/gpx+xml", `<?xml version="1.0"?><gpx version="1.1" creator="River Route">${marks}<trk><name>${name}</name><trkseg>${points}</trkseg></trk></gpx>`);
  } else if (format === "kml") {
    const points = route.map(([lat, lon]) => `${lon},${lat},0`).join(" ");
    const marks = annotations.map((p) => `<Placemark><name>${escapeXml(p.name)}</name><Point><coordinates>${p.coords[1]},${p.coords[0]},0</coordinates></Point></Placemark>`).join("");
    save(`${name}.kml`, "application/vnd.google-earth.kml+xml", `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>${points}</coordinates></LineString></Placemark>${marks}</Document></kml>`);
  } else if (format === "geojson") {
    save(`${name}.geojson`, "application/geo+json", JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name }, geometry: { type: "LineString", coordinates: route.map(([lat, lon]) => [lon, lat]) } }, ...annotations.map((p) => ({ type: "Feature", properties: { name: p.name }, geometry: { type: "Point", coordinates: [p.coords[1], p.coords[0]] } }))] }, null, 2));
  } else save(`${name}.csv`, "text/csv;charset=utf-8", `latitude,longitude\n${route.map(([lat, lon]) => `${lat},${lon}`).join("\n")}`);
}
