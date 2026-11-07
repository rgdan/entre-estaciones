export function minutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function costaRicaNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T12:00:00Z`))
    && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

export function isServiceDay(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day > 0 && day < 6;
}

export function nextServiceDate(date) {
  const next = new Date(`${date}T12:00:00Z`);
  do { next.setUTCDate(next.getUTCDate() + 1); } while ([0, 6].includes(next.getUTCDay()));
  return next.toISOString().slice(0, 10);
}

export function departures(route, from, to) {
  if (from === to || !route.stations.includes(from) || !route.stations.includes(to)) return [];
  const direction = route.stations.indexOf(from) < route.stations.indexOf(to) ? 'forward' : 'backward';
  return route[direction]
    .filter(trip => trip[from] && trip[to] && trip[from] < trip[to])
    .map(trip => ({ trip, departure: trip[from], arrival: trip[to], duration: minutes(trip[to]) - minutes(trip[from]) }))
    .sort((a, b) => a.departure.localeCompare(b.departure));
}

export function journey(route, from, to, date, time) {
  if (!validDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { state: 'invalid', all: [], upcoming: [] };
  }
  if (from === to) return { state: 'same', all: [], upcoming: [] };
  const all = departures(route, from, to);
  if (!isServiceDay(date)) return { state: 'weekend', all, upcoming: [] };
  const upcoming = all.filter(entry => entry.departure >= time);
  return { state: !all.length ? 'none' : upcoming.length ? 'ready' : 'finished', all, upcoming };
}
