import { routes, stationNames } from "./data/schedules.mjs";
import { coordinates } from "./data/coordinates.mjs";

const stations = Object.entries(coordinates).map(([id, point]) => [
  id,
  ...point,
]);
const colors = { heredia: "#ac2434", cartago: "#234f96", belen: "#367143" };
let map;
let segment;
let loading;

function updateSelection(from, to, itinerary) {
  if (!map) return;
  segment.clearLayers();
  for (const leg of itinerary?.legs || []) {
    const stops = Object.keys(leg.trip);
    const points = stops
      .slice(stops.indexOf(leg.from), stops.indexOf(leg.to) + 1)
      .map((id) => coordinates[id]);
    window.L.polyline(points, {
      color: "#e6b94b",
      weight: 7,
      opacity: 1,
    }).addTo(segment);
    window.L.circleMarker(coordinates[leg.from], {
      radius: 9,
      color: "#182c3d",
      fillColor: "#e6b94b",
      fillOpacity: 1,
    })
      .bindTooltip(`${stationNames[leg.from]} · ${leg.departure}`)
      .addTo(segment);
  }
  if (coordinates[from] && coordinates[to]) {
    window.L.circleMarker(coordinates[to], {
      radius: 9,
      color: "#182c3d",
      fillColor: "#e6b94b",
      fillOpacity: 1,
    }).addTo(segment);
  }
}

export async function showMap() {
  if (!map) {
    if (!loading)
      loading = loadMap().catch((error) => {
        loading = undefined;
        throw error;
      });
    await loading;
  }
  map.invalidateSize();
}

async function loadMap() {
  const status = document.getElementById("map-status");
  status.textContent = "Cargando mapa…";
  await Promise.all([
    new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      css.onload = resolve;
      css.onerror = () => {
        css.remove();
        reject(new Error("Map styles unavailable"));
      };
      document.head.append(css);
    }),
    new Promise((resolve, reject) => {
      if (window.L) return resolve();
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error("Map library unavailable"));
      };
      document.head.append(script);
    }),
  ]);
  const L = window.L;
  map = L.map("map", { scrollWheelZoom: false });
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    },
  ).addTo(map);
  tiles.on("tileerror", () => {
    status.textContent =
      "No se pudo cargar parte del mapa base. Las estaciones siguen disponibles en el diagrama.";
  });
  const points = stations.map((station) => station.slice(1));
  for (const route of routes) {
    L.polyline(
      route.stations.map((id) => coordinates[id]),
      { color: colors[route.id], weight: 4, opacity: 0.8 },
    )
      .bindTooltip(route.name)
      .addTo(map);
  }
  segment = L.featureGroup().addTo(map);
  for (const [id, latitude, longitude] of stations) {
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: "map-station-marker",
        html: '<span style="display:block;width:14px;height:14px;background:#182c3d;border:2px solid #fff;border-radius:50%"></span>',
        iconSize: [14, 14],
      }),
      title: stationNames[id],
      alt: stationNames[id],
    }).addTo(map);
    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = stationNames[id];
    popup.append(title);
    for (const endpoint of ["from", "to"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent =
        endpoint === "from" ? "Usar como origen" : "Usar como destino";
      button.style.cssText =
        "display:block;min-height:44px;padding:8px;margin-top:8px;background:#182c3d;color:#fff;border-radius:4px;width:100%";
      button.addEventListener("click", () => {
        document.getElementById(endpoint).value = id;
        document.getElementById(endpoint).dispatchEvent(new Event("change"));
        map.closePopup();
      });
      popup.append(button);
    }
    marker.bindPopup(popup);
  }
  map.fitBounds(points, { padding: [20, 20] });
  status.textContent = "Tocá una estación para elegir origen o destino.";
  document.addEventListener("journey-selection", (event) =>
    updateSelection(event.detail.from, event.detail.to, event.detail.itinerary),
  );
}
