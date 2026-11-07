import { minutes, validDate, isServiceDay } from "./journeys.mjs";

// Planning allowance, not an operator-guaranteed connection time.
export const TRANSFER_MINUTES = 5;

export function planJourneys(routes, from, to, date, time) {
  const empty = (state) => ({ state, all: [], upcoming: [] });
  const stations = new Set(routes.flatMap((route) => route.stations));
  if (
    !validDate(date) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !stations.has(from) ||
    !stations.has(to)
  )
    return empty("invalid");
  if (from === to) return empty("same");
  if (!isServiceDay(date)) return empty("weekend");

  const services = routes.flatMap((route) =>
    ["forward", "backward"].flatMap((direction) =>
      route[direction].map((trip, index) => ({
        id: `${route.id}-${direction}-${index}`,
        route,
        trip,
        stops: Object.keys(trip),
      })),
    ),
  );
  const leg = (service, start, end) => ({
    serviceId: service.id,
    routeId: service.route.id,
    routeName: service.route.shortName,
    trip: service.trip,
    from: start,
    to: end,
    departure: service.trip[start],
    arrival: service.trip[end],
  });
  const results = [];
  for (const first of services.filter((service) =>
    service.stops.includes(from),
  )) {
    const labels = new Map();
    for (const stop of first.stops.slice(first.stops.indexOf(from) + 1)) {
      labels.set(stop, {
        arrival: first.trip[stop],
        legs: [leg(first, from, stop)],
      });
    }
    const settled = new Set([from]);
    while (true) {
      const next = [...labels]
        .filter(([station]) => !settled.has(station))
        .sort(
          (a, b) =>
            a[1].arrival.localeCompare(b[1].arrival) ||
            a[1].legs.length - b[1].legs.length,
        )[0];
      if (!next) break;
      const [station, label] = next;
      if (station === to) {
        const departure = label.legs[0].departure;
        results.push({
          ...label,
          departure,
          duration: minutes(label.arrival) - minutes(departure),
          transfers: label.legs.length - 1,
        });
        break;
      }
      settled.add(station);
      for (const service of services) {
        const index = service.stops.indexOf(station);
        if (
          index < 0 ||
          service.id === label.legs.at(-1).serviceId ||
          minutes(service.trip[station]) <
            minutes(label.arrival) + TRANSFER_MINUTES
        )
          continue;
        for (const stop of service.stops.slice(index + 1)) {
          if (settled.has(stop)) continue;
          const candidate = {
            arrival: service.trip[stop],
            legs: [...label.legs, leg(service, station, stop)],
          };
          const current = labels.get(stop);
          if (
            !current ||
            candidate.arrival < current.arrival ||
            (candidate.arrival === current.arrival &&
              candidate.legs.length < current.legs.length)
          )
            labels.set(stop, candidate);
        }
      }
    }
  }
  const all = results.sort(
    (a, b) =>
      a.arrival.localeCompare(b.arrival) ||
      a.transfers - b.transfers ||
      b.departure.localeCompare(a.departure),
  );
  const upcoming = all.filter((result) => result.departure >= time);
  return {
    state: !all.length ? "none" : upcoming.length ? "ready" : "finished",
    all,
    upcoming,
  };
}
