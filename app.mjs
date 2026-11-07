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
  : costaRicaNow().date;
document
  .querySelectorAll("#journey-form [disabled], #share")
  .forEach((element) => {
    element.disabled = false;
  });

function saveSearch() {
  const search = new URLSearchParams({
    from: $("#from").value,
    to: $("#to").value,
    date: $("#date").value,
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
    $("#journey-details").open = true;
    $("#stops-title").focus();
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
    date = $("#date").value;
  const result = planJourneys(routes, from, to, date, "00:00");
  selectedJourney = result.upcoming[0];
  const selectedDate = validDate(date)
    ? new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "";
  $("#more-departures").replaceChildren();
  $("#all-departures").replaceChildren(
    ...result.upcoming
      .slice(6)
      .map((option, index) => departureButton(option, index + 6)),
  );
  $("#full-schedule").hidden = result.upcoming.length <= 6;
  $("#full-schedule summary").textContent =
    `Ver ${Math.max(0, result.upcoming.length - 6)} trenes más`;
  $("#journey-details").hidden = !selectedJourney;
  $("#journey-details").open = false;
  $("#board").hidden = result.state === "ready";
  const messages = {
    invalid: [
      "Revisá las estaciones y la fecha.",
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
  };
  if (result.state !== "ready") {
    const [title, text] = messages[result.state];
    $("#board").innerHTML =
      `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`;
    if (result.state === "weekend") {
      const next = nextServiceDate(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "solid-button";
      button.textContent = `Ver viajes del ${dateLabel(next)}`;
      button.addEventListener("click", () => {
        $("#date").value = next;
        render();
        $("#date").focus();
      });
      $("#board .empty-state").append(button);
    }
    $("#search-status").textContent = title;
  } else {
    $("#more-departures").replaceChildren(
      ...result.upcoming.slice(0, 6).map(departureButton),
    );
    $("#search-status").textContent =
      `${selectedDate} · ${result.upcoming.length} viajes`;
  }
  selectJourney(selectedJourney);
  $("#departures-section").setAttribute("aria-busy", "false");
  if (result.state !== "invalid") saveSearch();
}

$("#journey-form").addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
for (const id of ["from", "to", "date"])
  $(`#${id}`).addEventListener("change", () => {
    render();
  });
$("#swap").addEventListener("click", () => {
  const from = $("#from").value;
  $("#from").value = $("#to").value;
  $("#to").value = from;
  render();
});
$("#share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("#search-status").textContent = "Enlace del viaje copiado.";
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
render();
initializeMap();
