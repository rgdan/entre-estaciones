import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routes } from './data/schedules.mjs';
import { coordinates } from './data/coordinates.mjs';

const colors = { heredia: '#ac2434', cartago: '#234f96', belen: '#367143' };

export function createNetworkMap(element, { text, station, onStationSelect, onStatus }) {
  const map = L.map(element, { scrollWheelZoom: false, zoomControl: false });
  const zoom = L.control.zoom().addTo(map);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18,
  }).addTo(map);
  tiles.on('tileerror', () => onStatus('tilesError'));
  for (const route of routes) {
    L.polyline(route.stations.map(id => coordinates[id]), { color: colors[route.id], weight: 4, opacity: 0.8 }).bindTooltip(route.name).addTo(map);
  }
  const segment = L.featureGroup().addTo(map);
  const markers = Object.entries(coordinates).map(([id, point]) => {
    const marker = L.marker(point, {
      icon: L.divIcon({ className: 'map-station-marker', html: '<span class="map-station-dot"></span>', iconSize: [14, 14] }),
      title: station(id), alt: station(id),
    }).addTo(map);
    marker.bindPopup(document.createElement('div'));
    return [id, marker];
  });
  map.fitBounds(Object.values(coordinates), { padding: [20, 20] });

  function setLanguage() {
    for (const [id, marker] of markers) {
      marker.getElement().title = station(id);
      marker.getElement().setAttribute('aria-label', station(id));
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = station(id);
      popup.append(title);
      for (const endpoint of ['from', 'to']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-endpoint';
        button.textContent = text(endpoint === 'from' ? 'mapFrom' : 'mapTo');
        button.addEventListener('click', () => { onStationSelect(endpoint, id); map.closePopup(); });
        popup.append(button);
      }
      marker.setPopupContent(popup);
    }
    const controls = zoom.getContainer();
    for (const [selector, key] of [['.leaflet-control-zoom-in', 'zoomIn'], ['.leaflet-control-zoom-out', 'zoomOut']]) {
      const button = controls.querySelector(selector);
      button.title = text(key);
      button.setAttribute('aria-label', text(key));
    }
  }
  function update(from, to, itinerary) {
    segment.clearLayers();
    for (const leg of itinerary?.legs || []) {
      const stops = Object.keys(leg.trip);
      const points = stops.slice(stops.indexOf(leg.from), stops.indexOf(leg.to) + 1).map(id => coordinates[id]);
      L.polyline(points, { color: '#e6b94b', weight: 7, opacity: 1 }).addTo(segment);
      L.circleMarker(coordinates[leg.from], { radius: 9, color: '#182c3d', fillColor: '#e6b94b', fillOpacity: 1 }).bindTooltip(`${station(leg.from)} · ${leg.departure}`).addTo(segment);
    }
    if (itinerary && coordinates[to]) L.circleMarker(coordinates[to], { radius: 9, color: '#182c3d', fillColor: '#e6b94b', fillOpacity: 1 }).addTo(segment);
  }
  setLanguage();
  return { update, setLanguage, destroy: () => map.remove() };
}
