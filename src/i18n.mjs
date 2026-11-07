import { stationNames } from '../data/schedules.mjs';

export const messages = {
  es: {
    chooseStation: 'Elegí una estación', empty: 'Elegí origen y destino para ver los trenes.',
    title: 'Horarios de tren', description: 'Elegí tus estaciones y una fecha para ver los trenes y transbordos en Costa Rica.',
    skip: 'Saltar a los horarios', navigation: 'Preferencias', language: 'Idioma / Language', dark: 'Modo oscuro', light: 'Modo claro',
    planner: 'Planificar un viaje', from: 'Origen', to: 'Destino', date: 'Fecha', swap: 'Invertir origen y destino',
    trains: 'Trenes', departure: 'Salida', arrival: 'Llegada', select: 'Seleccionar', selected: 'Seleccionado', clear: 'Limpiar selección',
    direct: 'Tren directo', transfers: count => `${count} ${count === 1 ? 'transbordo' : 'transbordos'}`,
    trips: count => `${count} ${count === 1 ? 'viaje' : 'viajes'}`, more: count => `Ver ${count} trenes más`, less: 'Ver menos trenes',
    details: 'Detalle del viaje', steps: 'Trenes y transbordos',
    change: (station, arrival, departure, wait) => `Transbordo en ${station}: bajá a las ${arrival} y tomá el siguiente tren a las ${departure}. Espera: ${wait} min.`,
    map: 'Mapa', mapLabel: 'Mapa de toda la red de trenes', mapLoading: 'Cargando mapa…',
    mapHint: 'Tocá una estación para elegir origen o destino.', mapError: 'No pudimos cargar el mapa. Podés seguir consultando viajes.',
    tilesError: 'Parte del mapa base no está disponible. Las estaciones y los viajes siguen disponibles.', retryMap: 'Reintentar mapa',
    mapFrom: 'Usar como origen', mapTo: 'Usar como destino', zoomIn: 'Acercar', zoomOut: 'Alejar',
    invalid: 'Revisá las estaciones y la fecha.', same: 'Elegí dos estaciones distintas.',
    weekend: 'Sin servicio regular el fin de semana.', none: 'No encontramos una conexión publicada.',
    nextDay: date => `Ver trenes del ${date}`,
    footer: 'Horario no oficial. Sin afiliación con INCOFER.',
    notFound: 'Esta parada no existe.', back: 'Volver a los horarios',
  },
  en: {
    chooseStation: 'Choose a station', empty: 'Choose your origin and destination to see trains.',
    title: 'Train schedules', description: 'Choose your stations and a date to find trains and transfers across Costa Rica.',
    skip: 'Skip to schedules', navigation: 'Preferences', language: 'Idioma / Language', dark: 'Dark mode', light: 'Light mode',
    planner: 'Plan a journey', from: 'From', to: 'To', date: 'Date', swap: 'Swap origin and destination',
    trains: 'Trains', departure: 'Departure', arrival: 'Arrival', select: 'Select', selected: 'Selected', clear: 'Clear selection',
    direct: 'Direct train', transfers: count => `${count} ${count === 1 ? 'transfer' : 'transfers'}`,
    trips: count => `${count} ${count === 1 ? 'journey' : 'journeys'}`, more: count => `Show ${count} more trains`, less: 'Show fewer trains',
    details: 'Journey details', steps: 'Trains and transfers',
    change: (station, arrival, departure, wait) => `Change at ${station}: arrive at ${arrival} and take the next train at ${departure}. Wait: ${wait} min.`,
    map: 'Map', mapLabel: 'Map of the entire train network', mapLoading: 'Loading map…',
    mapHint: 'Choose a station to set your origin or destination.', mapError: 'We could not load the map. You can still search for trains.',
    tilesError: 'Part of the base map is unavailable. Stations and journeys are still available.', retryMap: 'Retry map',
    mapFrom: 'Set as origin', mapTo: 'Set as destination', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    invalid: 'Check the stations and date.', same: 'Choose two different stations.',
    weekend: 'No regular service on weekends.', none: 'No published connection found.',
    nextDay: date => `Show trains for ${date}`,
    footer: 'Unofficial timetable. Not affiliated with INCOFER.',
    notFound: 'This stop does not exist.', back: 'Back to schedules',
  },
};

export function stationLabel(id, language) {
  const name = stationNames[id];
  return language === 'en' ? name.replace(/^Estación (.+)$/, '$1 station') : name;
}
