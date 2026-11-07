import { routes, stationNames } from "./data/schedules.mjs";
import {
  costaRicaNow,
  minutes,
  nextServiceDate,
  validDate,
} from "./lib/journeys.mjs";
import { planJourneys } from "./lib/transfers.mjs";

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
let selectedJourney;
let liveTime = !params.has("date") && !params.has("time");
let lastNow = costaRicaNow();
const dateLabel = (date) =>
  new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const connectionLabel = (option) =>
  option.transfers
    ? `${option.transfers} ${option.transfers === 1 ? "transbordo" : "transbordos"}`
    : "Tren directo";
const stationIds = Object.keys(stationNames).sort((a, b) =>
  stationNames[a].localeCompare(stationNames[b], "es"),
);
for (const id of ["from", "to"]) {
  $(`#${id}`).replaceChildren(
    ...stationIds.map((station) => new Option(stationNames[station], station)),
  );
  $(`#${id}`).value = stationIds.includes(params.get(id))
    ? params.get(id)
    : id === "from"
      ? "heredia"
      : "cartago";
}
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

function departureButton(option, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "departure-row";
  button.dataset.option = index;
  button.setAttribute("aria-pressed", String(option === selectedJourney));
  button.innerHTML = `<span class="row-time">${option.departure}<span class="row-label">Salida</span></span><span class="row-time">${option.arrival}<span class="row-label">Llegada</span></span><span class="row-duration">${option.duration} min<span class="row-label">${connectionLabel(option)}</span></span>`;
  button.addEventListener("click", () => {
    selectJourney(option);
    document
      .querySelectorAll(".departure-row")
      .forEach((row) =>
        row.setAttribute(
          "aria-pressed",
          String(row.dataset.option === String(index)),
        ),
      );
  });
  return button;
}

function selectJourney(option) {
  selectedJourney = option;
  $("#service-label").textContent = option
    ? `${option.departure} → ${option.arrival} · ${connectionLabel(option)}`
    : "Elegí un viaje para ver sus trenes y transbordos.";
  $("#stop-count").textContent = option
    ? `${option.legs.length} ${option.legs.length === 1 ? "tren" : "trenes"}`
    : "";
  const list = $("#station-diagram");
  list.replaceChildren();
  option?.legs.forEach((leg, index) => {
    if (index) {
      const previous = option.legs[index - 1];
      const change = document.createElement("li");
      change.className = "transfer-stop";
      change.textContent = `Transbordo en ${stationNames[leg.from]}: bajá a las ${previous.arrival} y tomá el siguiente tren a las ${leg.departure}. Espera: ${minutes(leg.departure) - minutes(previous.arrival)} min.`;
      list.append(change);
    }
    const heading = document.createElement("li");
    heading.className = "leg-heading";
    heading.textContent = `${leg.routeName} · ${leg.departure} → ${leg.arrival}`;
    list.append(heading);
    const stops = Object.keys(leg.trip);
    for (const station of stops.slice(
      stops.indexOf(leg.from),
      stops.indexOf(leg.to) + 1,
    )) {
      const item = document.createElement("li");
      item.className = `in-range${station === leg.from || station === leg.to ? " endpoint" : ""}`;
      const label = document.createElement("span");
      label.textContent = stationNames[station];
      const time = document.createElement("span");
      time.className = "station-time";
      time.textContent = leg.trip[station];
      item.append(label, time);
      list.append(item);
    }
  });
  document.dispatchEvent(
    new CustomEvent("journey-selection", {
      detail: { from: $("#from").value, to: $("#to").value, itinerary: option },
    }),
  );
}

function render() {
  const from = $("#from").value,
    to = $("#to").value,
    date = $("#date").value,
    time = $("#after").value;
  const result = planJourneys(routes, from, to, date, time);
  selectedJourney = result.upcoming[0];
  $("#selected-date").textContent = validDate(date)
    ? new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "";
  $("#more-departures").replaceChildren();
  $("#all-departures").replaceChildren(...result.all.map(departureButton));
  $("#full-schedule").hidden = !result.all.length;
  const messages = {
    invalid: [
      "Revisá las estaciones, la fecha y la hora.",
      "Completá los campos para buscar en toda la red.",
    ],
    same: [
      "Elegí dos estaciones distintas.",
      "El origen y el destino son la misma estación.",
    ],
    weekend: [
      "El fin de semana, sin servicio regular.",
      "Los horarios aportados son de lunes a viernes.",
    ],
    none: [
      "No encontramos una conexión publicada.",
      "No hay una combinación de trenes que conecte estas estaciones con el margen de transbordo indicado.",
    ],
    finished: [
      "No quedan conexiones a esa hora.",
      "Probá el próximo día hábil o una hora anterior.",
    ],
  };
  if (result.state !== "ready") {
    const [title, text] = messages[result.state];
    $("#board").innerHTML =
      `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`;
    if (["weekend", "finished"].includes(result.state)) {
      const next = nextServiceDate(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "solid-button";
      button.textContent = `Ver viajes del ${dateLabel(next)}`;
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
    $("#board").innerHTML =
      `<div class="board-top"><strong>Mejor llegada · ${dateLabel(date)}</strong><span>Desde las ${time}</span></div><div class="board-journey"><div><div class="board-time">${next.departure}</div><div class="board-station">${stationNames[from]}</div></div><span class="journey-connector" aria-hidden="true"></span><div class="board-arrival"><div class="board-time">${next.arrival}</div><div class="board-station">${stationNames[to]}</div></div></div><div class="board-bottom"><span>${next.duration} min en total · ${connectionLabel(next)}</span><button type="button" class="board-button">Ver viaje y transbordos</button></div>`;
    $("#board .board-button").addEventListener("click", () => {
      selectJourney(next);
      $("#stops-title").focus();
      $("#stops-title").scrollIntoView({ block: "start" });
    });
    $("#more-departures").replaceChildren(
      ...result.upcoming
        .slice(1, 5)
        .map((option, index) =>
          departureButton(option, result.all.indexOf(option)),
        ),
    );
    $("#search-status").textContent =
      `${result.upcoming.length} opciones el ${dateLabel(date)} desde las ${time}, ordenadas por llegada. Las líneas y los transbordos se calculan automáticamente.`;
  }
  selectJourney(selectedJourney);
  $("#fares").replaceChildren(
    ...routes.flatMap((route) =>
      route.fares.map((fare) => {
        const row = document.createElement("div");
        row.className = "fare-row";
        row.textContent = `${stationNames[fare.from]} ↔ ${stationNames[fare.to]}`;
        const amount = document.createElement("strong");
        amount.textContent = `₡${fare.amount}`;
        row.append(amount);
        return row;
      }),
    ),
  );
  $("#departures-section").setAttribute("aria-busy", "false");
  if (result.state !== "invalid") saveSearch();
}

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
      "Copiá el enlace desde la barra de direcciones.";
  }
});
$("#retry-map").addEventListener("click", initializeMap);
async function initializeMap() {
  $("#retry-map").hidden = true;
  try {
    const { showMap } = await import("./map.mjs");
    await showMap();
    document.dispatchEvent(
      new CustomEvent("journey-selection", {
        detail: {
          from: $("#from").value,
          to: $("#to").value,
          itinerary: selectedJourney,
        },
      }),
    );
  } catch {
    $("#map-status").textContent =
      "No pudimos cargar el mapa. Podés seguir consultando viajes y reintentar.";
    $("#retry-map").hidden = false;
  }
}
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
initializeMap();
