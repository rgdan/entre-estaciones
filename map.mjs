import { stationNames } from "./data/schedules.mjs";

// Coordinates retained from the original prototype; not surveyed station entrances.
const stations = [
  ["hospital", 10.00854, -84.20918],
  ["aeropuerto", 10.001578793269504, -84.19525690460804],
  ["riosegundo", 10.00272, -84.1842],
  ["sanjoaquin", 10.00319, -84.1524],
  ["sanfrancisco", 9.99482, -84.1293],
  ["heredia", 9.9948, -84.1174],
  ["miraflores", 9.98738, -84.10896],
  ["santarosa", 9.97215, -84.09825],
  ["colima", 9.95783, -84.08814],
  ["calleblancos", 9.9461, -84.073],
  ["atlantico", 9.93481, -84.06884],
  ["ucr", 9.93409, -84.05262],
  ["ulatina", 9.93261, -84.04415],
];
let map;
let segment;
let loading;

function updateSelection(from, to) {
  if (!map) return;
  const start = stations.findIndex((station) => station[0] === from);
  const end = stations.findIndex((station) => station[0] === to);
  if (start < 0 || end < 0) return;
  segment.setLatLngs(
    stations
      .slice(Math.min(start, end), Math.max(start, end) + 1)
      .map((station) => station.slice(1)),
  );
}

export async function showMap(from, to) {
  if (!map) {
    if (!loading)
      loading = loadMap().catch((error) => {
        loading = undefined;
        throw error;
      });
    await loading;
  }
  map.invalidateSize();
  updateSelection(from, to);
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
  const coordinates = stations.map((station) => station.slice(1));
  L.polyline(coordinates, { color: "#647580", weight: 3 }).addTo(map);
  segment = L.polyline([], { color: "#a37916", weight: 5 }).addTo(map);
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
  map.fitBounds(coordinates, { padding: [20, 20] });
  status.textContent = "Tocá una estación para elegir origen o destino.";
  document.addEventListener("journey-selection", (event) =>
    updateSelection(event.detail.from, event.detail.to),
  );
}
