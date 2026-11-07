<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { routes, stationNames } from '../data/schedules.mjs';
import { costaRicaNow, minutes, nextServiceDate, validDate } from '../lib/journeys.mjs';
import { planJourneys } from '../lib/transfers.mjs';
import { messages, stationLabel } from './i18n.mjs';

const params = new URLSearchParams(location.search);
let savedLanguage;
let savedTheme;
try {
  savedLanguage = localStorage.getItem('entre-estaciones-language');
  savedTheme = localStorage.getItem('entre-estaciones-theme');
} catch {}
const language = ref(['en', 'es'].includes(params.get('lang')) ? params.get('lang') : ['en', 'es'].includes(savedLanguage) ? savedLanguage : navigator.language.startsWith('en') ? 'en' : 'es');
const dark = ref(savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
const from = ref(params.get('from') === '' || Object.hasOwn(stationNames, params.get('from')) ? params.get('from') : 'heredia');
const to = ref(params.get('to') === '' || Object.hasOwn(stationNames, params.get('to')) ? params.get('to') : 'cartago');
const date = ref(validDate(params.get('date') || '') ? params.get('date') : costaRicaNow().date);
const selected = shallowRef(null);
const showAll = ref(false);
const detailsOpen = ref(false);
const stopsTitle = ref(null);
const mapElement = ref(null);
const mapStatus = ref('mapLoading');
let mapController;
let disposed = false;
const notFound = !['/', '/index.html'].includes(location.pathname);
const t = computed(() => messages[language.value]);
const station = id => stationLabel(id, language.value);
const stationIds = computed(() => Object.keys(stationNames).sort((a, b) => station(a).localeCompare(station(b), language.value)));
const result = computed(() => !from.value || !to.value ? { state: 'empty', all: [], upcoming: [] } : planJourneys(routes, from.value, to.value, date.value, '00:00'));
const visibleJourneys = computed(() => showAll.value ? result.value.upcoming : result.value.upcoming.slice(0, 6));
const formatDate = value => new Intl.DateTimeFormat(language.value === 'en' ? 'en-GB' : 'es-CR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const dateSummary = computed(() => validDate(date.value) ? `${formatDate(date.value)} · ${t.value.trips(result.value.upcoming.length)}` : '');
const connectionLabel = option => option.transfers ? t.value.transfers(option.transfers) : t.value.direct;
const legStops = leg => {
  const stops = Object.keys(leg.trip);
  return stops.slice(stops.indexOf(leg.from), stops.indexOf(leg.to) + 1);
};

watchEffect(() => {
  document.documentElement.lang = language.value;
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
  document.title = `${notFound ? t.value.notFound : t.value.title} · Entre estaciones`;
  document.querySelector('meta[name="theme-color"]').content = dark.value ? '#111c27' : '#f3f4ef';
  document.querySelector('meta[name="description"]').content = t.value.description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = t.value.description;
  try {
    localStorage.setItem('entre-estaciones-language', language.value);
    localStorage.setItem('entre-estaciones-theme', dark.value ? 'dark' : 'light');
  } catch {}
});
watch([from, to, date], () => { selected.value = null; showAll.value = false; detailsOpen.value = false; });
watch([from, to, date, language], () => {
  if (notFound || !validDate(date.value)) return;
  history.replaceState(null, '', `${location.pathname}?${new URLSearchParams({ from: from.value, to: to.value, date: date.value, lang: language.value })}`);
}, { immediate: true });
watch([from, to, selected, language], () => {
  mapController?.update(from.value, to.value, selected.value);
  mapController?.setLanguage();
});
async function clearSelection() {
  from.value = '';
  to.value = '';
  selected.value = null;
  detailsOpen.value = false;
  await nextTick();
  document.getElementById('from')?.focus({ preventScroll: true });
}
function swapStations() { [from.value, to.value] = [to.value, from.value]; }
async function selectJourney(option) {
  selected.value = option;
  detailsOpen.value = true;
  await nextTick();
  stopsTitle.value?.focus({ preventScroll: true });
}
function retryMap() { location.reload(); }
async function initializeMap() {
  mapStatus.value = 'mapLoading';
  try {
    const { createNetworkMap } = await import('../map.mjs');
    if (disposed) return;
    mapController?.destroy();
    mapController = createNetworkMap(mapElement.value, {
      text: key => t.value[key], station,
      onStationSelect: (endpoint, id) => { if (endpoint === 'from') from.value = id; else to.value = id; },
      onStatus: key => { mapStatus.value = key; },
    });
    mapController.update(from.value, to.value, selected.value);
    mapStatus.value = 'mapHint';
  } catch { if (!disposed) mapStatus.value = 'mapError'; }
}
onMounted(() => { if (!notFound) initializeMap(); });
onBeforeUnmount(() => { disposed = true; mapController?.destroy(); });
</script>

<template>
  <a class="skip-link" href="#horarios">{{ t.skip }}</a>
  <header class="site-header wrap">
    <a class="wordmark" href="./">entre<br />estaciones<span>CR</span></a>
    <nav :aria-label="t.navigation">
      <select id="language" v-model="language" class="language-picker" :aria-label="t.language">
        <option value="es">Español</option><option value="en">English</option>
      </select>
      <button class="theme-toggle" type="button" :aria-pressed="dark" @click="dark = !dark">{{ dark ? t.light : t.dark }}</button>
    </nav>
  </header>
  <main class="wrap" id="horarios">
    <template v-if="notFound">
      <div class="not-found"><p>404</p><h1>{{ t.notFound }}</h1><a class="solid-button" href="/">{{ t.back }}</a></div>
    </template>
    <template v-else>
      <h1>{{ t.title }}</h1>
      <section class="planner" :aria-label="t.planner">
        <form id="journey-form" @submit.prevent>
          <div class="field"><label for="from">{{ t.from }}</label><select id="from" v-model="from" required><option value="" disabled>{{ t.chooseStation }}</option><option v-for="id in stationIds" :key="id" :value="id">{{ station(id) }}</option></select></div>
          <button id="swap" class="swap" type="button" :aria-label="t.swap" @click="swapStations">⇄</button>
          <div class="field"><label for="to">{{ t.to }}</label><select id="to" v-model="to" required><option value="" disabled>{{ t.chooseStation }}</option><option v-for="id in stationIds" :key="id" :value="id">{{ station(id) }}</option></select></div>
          <div class="field"><label for="date">{{ t.date }}</label><input id="date" v-model="date" type="date" required /></div>
        </form>
        <button id="clear-selection" type="button" @click="clearSelection">{{ t.clear }}</button>
      </section>
      <div class="journey-layout">
        <section class="departures" aria-labelledby="departures-title" id="departures-section">
          <div class="section-heading"><h2 id="departures-title">{{ t.trains }}</h2></div>
          <p id="search-status" class="search-status" role="status" aria-live="polite">{{ dateSummary }}</p>
          <div v-if="result.state !== 'ready'" id="board" class="search-message">
            <p>{{ t[result.state] }}</p>
            <button v-if="result.state === 'weekend'" class="solid-button" type="button" @click="date = nextServiceDate(date)">{{ t.nextDay(formatDate(nextServiceDate(date))) }}</button>
          </div>
          <ul v-else id="train-list" class="train-list">
            <li v-for="option in visibleJourneys" :key="option.legs.map(leg => leg.serviceId).join(':')" class="departure-row" :class="{ 'is-selected': selected === option }">
              <span class="row-time">{{ option.departure }}<span class="row-label">{{ t.departure }}</span></span>
              <span class="row-time">{{ option.arrival }}<span class="row-label">{{ t.arrival }}</span></span>
              <span class="row-duration">{{ option.duration }} min<span class="row-label">{{ connectionLabel(option) }}</span></span>
              <button class="select-journey" type="button" :aria-pressed="selected === option" :aria-label="`${selected === option ? t.selected : t.select}: ${option.departure} → ${option.arrival}`" @click="selectJourney(option)">{{ selected === option ? t.selected : t.select }}</button>
            </li>
          </ul>
          <button v-if="result.upcoming.length > 6" id="more-trains" type="button" class="text-button" :aria-expanded="showAll" @click="showAll = !showAll">{{ showAll ? t.less : t.more(result.upcoming.length - 6) }}</button>
          <details v-if="selected" id="journey-details" class="journey-details" :open="detailsOpen" @toggle="detailsOpen = $event.target.open">
            <summary>{{ t.details }}</summary>
            <h3 id="stops-title" ref="stopsTitle" tabindex="-1">{{ t.steps }}</h3>
            <p id="service-label" class="service-label">{{ selected.departure }} → {{ selected.arrival }} · {{ connectionLabel(selected) }}</p>
            <ol id="station-diagram" class="station-diagram">
              <template v-for="(leg, index) in selected.legs" :key="leg.serviceId">
                <li v-if="index" class="transfer-stop">{{ t.change(station(leg.from), selected.legs[index - 1].arrival, leg.departure, minutes(leg.departure) - minutes(selected.legs[index - 1].arrival)) }}</li>
                <li class="leg-heading">{{ leg.routeName }} · {{ leg.departure }} → {{ leg.arrival }}</li>
                <li v-for="id in legStops(leg)" :key="id" class="in-range" :class="{ endpoint: id === leg.from || id === leg.to }"><span>{{ station(id) }}</span><span class="station-time">{{ leg.trip[id] }}</span></li>
              </template>
            </ol>
          </details>
        </section>
        <section class="network-map" aria-labelledby="map-title">
          <div class="section-heading"><h2 id="map-title">{{ t.map }}</h2></div>
          <div id="map" ref="mapElement" :aria-label="t.mapLabel"></div>
          <p class="map-legend"><span class="line-heredia">Alajuela / Heredia</span><span class="line-cartago">Cartago / Paraíso</span><span class="line-belen">Pavas / Belén</span></p>
          <div id="map-status" role="status">{{ t[mapStatus] }}</div>
          <button v-if="mapStatus === 'mapError'" id="retry-map" class="solid-button" type="button" @click="retryMap">{{ t.retryMap }}</button>
        </section>
      </div>
    </template>
  </main>
  <footer class="site-footer wrap"><span>{{ t.footer }}</span></footer>
</template>
