import { routes, stationNames } from "./data/schedules.mjs";
import {
  costaRicaNow,
  journey,
  minutes,
  nextServiceDate,
  validDate,
} from "./lib/journeys.mjs";

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
let route = routes.find((item) => item.id === params.get("route")) || routes[0];
let selectedTrip;
let showAllStations = false;
let liveTime = !params.has("date") && !params.has("time");
let lastNow = costaRicaNow();
const defaults = {
  heredia: ["heredia", "atlantico"],
  cartago: ["atlantico", "cartago"],
  belen: ["pacifico", "belen"],
};
const dateLabel = (date) =>
  new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const currency = (amount) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(amount);

function setStations(from, to) {
  for (const id of ["from", "to"]) {
    const select = $(`#${id}`);
    select.replaceChildren(
      ...route.stations.map(
        (station) => new Option(stationNames[station], station),
      ),
    );
    select.value = id === "from" ? from : to;
  }
}

setStations(
  route.stations.includes(params.get("from"))
    ? params.get("from")
    : defaults[route.id][0],
  route.stations.includes(params.get("to"))
    ? params.get("to")
    : defaults[route.id][1],
);
$("#date").value = validDate(params.get("date") || "")
  ? params.get("date")
  : lastNow.date;
$("#after").value = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(params.get("time") || "")
  ? params.get("time")
  : lastNow.time;
document
  .querySelectorAll("#journey-form [disabled], #use-now, #share")
  .forEach((element) => {
    element.disabled = false;
  });

function saveSearch() {
  const search = new URLSearchParams({
    route: route.id,
    from: $("#from").value,
    to: $("#to").value,
    date: $("#date").value,
    time: $("#after").value,
  });
  history.replaceState(
    null,
    "",
    `${location.pathname}?${search}${location.hash}`,
  );
}

function departureButton(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "departure-row";
  button.setAttribute("aria-pressed", String(entry.trip === selectedTrip));
  button.innerHTML = `<span class="row-time">${entry.departure}<span class="row-label">Salida</span></span><span class="row-time">${entry.arrival}<span class="row-label">Llegada</span></span><span class="row-duration">${entry.duration} min<span class="row-label">Ver paradas</span></span>`;
  button.addEventListener("click", () => selectTrip(entry.trip));
  button.dataset.departure = entry.departure;
  return button;
}

function selectTrip(trip) {
  selectedTrip = trip;
  renderDiagram();
  document
    .querySelectorAll(".departure-row")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.departure === trip[$("#from").value]),
      ),
    );
  $("#search-status").textContent =
    `Paradas seleccionadas: salida ${trip[$("#from").value]}, llegada ${trip[$("#to").value]}.`;
}

function renderDiagram() {
  const from = $("#from").value;
  const to = $("#to").value;
  const fromIndex = route.stations.indexOf(from);
  const toIndex = route.stations.indexOf(to);
  const order =
    fromIndex <= toIndex ? route.stations : [...route.stations].reverse();
  const low = Math.min(fromIndex, toIndex);
  const high = Math.max(fromIndex, toIndex);
  $("#stop-count").textContent =
    `${showAllStations ? route.stations.length : high - low + 1} estaciones`;
  $("#toggle-stations").textContent = showAllStations
    ? "Ver solo el tramo elegido"
    : `Ver todas las estaciones (${route.stations.length})`;
  $("#toggle-stations").setAttribute("aria-expanded", String(showAllStations));
  $("#service-label").textContent = selectedTrip
    ? `Paradas del servicio ${selectedTrip[from]} → ${selectedTrip[to]}`
    : "Recorrido de la ruta. No hay un servicio seleccionado.";
  $("#station-diagram").replaceChildren(
    ...order
      .filter(
        (station) =>
          showAllStations ||
          (route.stations.indexOf(station) >= low &&
            route.stations.indexOf(station) <= high),
      )
      .map((station) => {
        const item = document.createElement("li");
        const index = route.stations.indexOf(station);
        item.classList.toggle("in-range", index >= low && index <= high);
        item.classList.toggle("endpoint", station === from || station === to);
        const button = document.createElement("button");
        button.type = "button";
        const label = document.createElement("span");
        label.textContent = stationNames[station];
        if (station === from || station === to) {
          const tag = document.createElement("span");
          tag.className = "endpoint-tag";
          tag.textContent =
            station === from && station === to
              ? "Origen y destino"
              : station === from
                ? "Origen"
                : "Destino";
          label.append(tag);
        }
        const time = document.createElement("span");
        time.className = "station-time";
        time.textContent = selectedTrip?.[station] || "Sin hora";
        button.append(label, time);
        button.addEventListener("click", () => {
          const endpoint = $('input[name="endpoint"]:checked').value;
          $(`#${endpoint}`).value = station;
          render();
          $(`#${endpoint}`).focus();
        });
        item.append(button);
        return item;
      }),
  );
  $("#station-map").href =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stationNames[from]} tren Costa Rica`)}`;
  $("#station-map").textContent = `Buscar ${stationNames[from]} en el mapa`;
  $("#geographic-map").hidden = route.id !== "heredia";
  if (route.id !== "heredia") $("#geographic-map").open = false;
  document.dispatchEvent(
    new CustomEvent("journey-selection", { detail: { from, to } }),
  );
}

function render() {
  const from = $("#from").value;
  const to = $("#to").value;
  const date = $("#date").value;
  const time = $("#after").value;
  const result = journey(route, from, to, date, time);
  selectedTrip = result.upcoming[0]?.trip;
  $("#route-name").textContent = `${route.name} · Vigencia sin confirmar`;
  $("#selected-date").textContent = validDate(date)
    ? new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "";
  document
    .querySelectorAll("[data-route]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.route === route.id),
      ),
    );
  $("#more-departures").replaceChildren();
  $("#all-departures").replaceChildren(...result.all.map(departureButton));
  $("#full-schedule").hidden = !result.all.length;
  const messages = {
    invalid: [
      "Revisá la fecha y la hora.",
      "Completá ambos campos con una fecha y hora válidas.",
    ],
    same: [
      "Elegí dos estaciones distintas.",
      "El origen y el destino son la misma estación.",
    ],
    weekend: [
      "El fin de semana, sin servicio regular.",
      "Los horarios aportados son de lunes a viernes. Podés consultar el próximo día hábil.",
    ],
    none: [
      "Este tramo no tiene un tren directo.",
      "Ningún servicio publicado se detiene en ambas estaciones en este sentido. Probá otro origen o destino.",
    ],
    finished: [
      "Por hoy, pasó el último tren.",
      "No quedan salidas después de la hora que elegiste. El horario completo sigue disponible abajo.",
    ],
  };
  if (result.state !== "ready") {
    const [title, text] = messages[result.state];
    $("#board").innerHTML =
      `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`;
    if (["weekend", "finished"].includes(result.state)) {
      const next = nextServiceDate(date);
      const button = document.createElement("button");
      button.className = "solid-button";
      button.type = "button";
      button.textContent = `Ver salidas del ${dateLabel(next)}`;
      button.addEventListener("click", () => {
        liveTime = false;
        $("#date").value = next;
        $("#after").value = "00:00";
        render();
        $("#date").focus();
      });
      $("#board .empty-state").append(button);
    }
    $("#search-status").textContent = title;
  } else {
    const next = result.upcoming[0];
    const difference = minutes(next.departure) - minutes(time);
    const wait = !liveTime
      ? `Desde las ${time}`
      : difference === 0
        ? "A la hora consultada"
        : `En ${difference >= 60 ? `${Math.floor(difference / 60)} h ` : ""}${difference % 60} min`;
    $("#board").innerHTML =
      `<div class="board-top"><strong>Próxima salida · ${dateLabel(date)}</strong><span>${wait}</span></div><div class="board-journey"><div><div class="board-time">${next.departure}</div><div class="board-station">${stationNames[from]}</div></div><span class="journey-connector" aria-hidden="true"></span><div class="board-arrival"><div class="board-time">${next.arrival}</div><div class="board-station">${stationNames[to]}</div></div></div><div class="board-bottom"><span>${next.duration} min de viaje · Tren directo</span><button type="button" class="board-button">Ver estas paradas</button></div>`;
    $("#board .board-button").addEventListener("click", () => {
      selectTrip(next.trip);
      $("#stops-title").setAttribute("tabindex", "-1");
      $("#stops-title").focus();
      $("#stops-title").scrollIntoView({ block: "start" });
    });
    $("#more-departures").replaceChildren(
      ...result.upcoming.slice(1, 5).map(departureButton),
    );
    $("#search-status").textContent =
      `${result.upcoming.length} ${result.upcoming.length === 1 ? "salida disponible" : "salidas disponibles"} el ${dateLabel(date)} a partir de las ${time}.`;
  }
  $("#fares").replaceChildren(
    ...route.fares.map((fare) => {
      const row = document.createElement("div");
      row.className = "fare-row";
      const label = document.createElement("span");
      label.textContent = `${stationNames[fare.from]} ↔ ${stationNames[fare.to]}`;
      const amount = document.createElement("strong");
      amount.textContent = currency(fare.amount);
      row.append(label, amount);
      return row;
    }),
  );
  renderDiagram();
  $("#departures-section").setAttribute("aria-busy", "false");
  if (result.state !== "invalid") saveSearch();
}

document.querySelectorAll("[data-route]").forEach((button) =>
  button.addEventListener("click", () => {
    route = routes.find((item) => item.id === button.dataset.route);
    showAllStations = false;
    setStations(...defaults[route.id]);
    render();
  }),
);
$("#toggle-stations").addEventListener("click", () => {
  showAllStations = !showAllStations;
  renderDiagram();
});
$("#journey-form").addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
for (const id of ["from", "to", "date", "after"])
  $(`#${id}`).addEventListener("change", () => {
    if (["date", "after"].includes(id)) liveTime = false;
    render();
  });
$("#swap").addEventListener("click", () => {
  const from = $("#from").value;
  $("#from").value = $("#to").value;
  $("#to").value = from;
  render();
});
$("#use-now").addEventListener("click", () => {
  lastNow = costaRicaNow();
  $("#date").value = lastNow.date;
  $("#after").value = lastNow.time;
  liveTime = true;
  render();
});
$("#share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("#search-status").textContent =
      "Enlace del viaje copiado. Incluye estaciones, fecha y hora.";
  } catch {
    $("#search-status").textContent =
      "No pudimos copiarlo. Copiá el enlace desde la barra de direcciones.";
  }
});
$("#geographic-map").addEventListener("toggle", async () => {
  if (!$("#geographic-map").open) return;
  try {
    const { showMap } = await import("./map.mjs");
    await showMap($("#from").value, $("#to").value);
  } catch {
    $("#map-status").textContent =
      "No pudimos cargar el mapa. El diagrama y los horarios siguen disponibles.";
  }
});

function tick() {
  const now = costaRicaNow();
  $("#clock").textContent = now.time;
  $("#clock").dateTime = `${now.date}T${now.time}:00-06:00`;
  $("#today").textContent = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Costa_Rica",
  }).format(new Date());
  if (liveTime && (now.time !== lastNow.time || now.date !== lastNow.date)) {
    $("#date").value = now.date;
    $("#after").value = now.time;
    render();
  }
  lastNow = now;
}
render();
tick();
setInterval(tick, 15000);
