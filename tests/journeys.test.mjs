import test from 'node:test';
import assert from 'node:assert/strict';
import { routes } from '../data/schedules.mjs';
import { costaRicaNow, departures, journey, nextServiceDate, validDate } from '../lib/journeys.mjs';

test('Costa Rican dates remain correct at UTC midnight and local midnight', () => {
  assert.deepEqual(costaRicaNow(new Date('2026-11-07T02:30:00Z')), { date: '2026-11-06', time: '20:30' });
  assert.deepEqual(costaRicaNow(new Date('2026-11-07T06:00:00Z')), { date: '2026-11-07', time: '00:00' });
});

test('weekends have no departures and next service skips to Monday', () => {
  assert.equal(journey(routes[0], 'heredia', 'atlantico', '2026-11-07', '06:00').state, 'weekend');
  assert.equal(journey(routes[0], 'heredia', 'atlantico', '2026-11-08', '06:00').upcoming.length, 0);
  assert.equal(nextServiceDate('2026-11-06'), '2026-11-09');
  assert.equal(nextServiceDate('2026-12-31'), '2027-01-01');
});

test('late searches do not wrap and exact departure minutes are included', () => {
  const search = time => journey(routes[0], 'heredia', 'atlantico', '2026-11-09', time);
  assert.equal(search('20:01').upcoming[0].departure, '20:01');
  assert.equal(search('20:02').state, 'finished');
  assert.equal(search('20:02').upcoming.length, 0);
  assert.equal(search('06:02').upcoming[0].departure, '06:11');
});

test('direct service needs both stations, in the requested direction', () => {
  assert.equal(departures(routes[0], 'hospital', 'ulatina').length, 0);
  assert.equal(departures(routes[0], 'heredia', 'ulatina').length, 3);
  assert.equal(departures(routes[0], 'atlantico', 'hospital')[0].departure, '04:50');
  assert.equal(departures(routes[1], 'atlantico', 'paraiso').length, 2);
  assert.equal(departures(routes[2], 'metropoli', 'cfia')[0].arrival, '17:11');
  assert.equal(departures(routes[0], 'unknown', 'atlantico').length, 0);
  assert.equal(journey(routes[0], 'heredia', 'heredia', '2026-11-09', '06:00').state, 'same');
});

test('invalid dates and times are rejected at the search boundary', () => {
  for (const date of ['2026-02-30', 'anything', '2026-13-01', '2026-1-01']) assert.equal(validDate(date), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(journey(routes[0], 'heredia', 'atlantico', '2026-11-09', '25:00').state, 'invalid');
});
