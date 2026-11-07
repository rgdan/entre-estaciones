import test from 'node:test';
import assert from 'node:assert/strict';
import { routes, stationNames } from '../data/schedules.mjs';

test('all 94 services have valid stations, times and chronological stops', () => {
  assert.deepEqual(routes.map(route => [route.forward.length, route.backward.length]), [[23, 23], [14, 14], [10, 10]]);
  for (const route of routes) {
    assert.equal(new Set(route.stations).size, route.stations.length);
    for (const direction of ['forward', 'backward']) {
      const order = direction === 'forward' ? route.stations : [...route.stations].reverse();
      for (const trip of route[direction]) {
        let previousTime = '';
        let previousIndex = -1;
        for (const [station, time] of Object.entries(trip)) {
          assert.ok(stationNames[station], `${route.id}: unknown station ${station}`);
          assert.match(time, /^(?:[01]\d|2[0-3]):[0-5]\d$/);
          assert.ok(time > previousTime, `${route.id}: ${station} is out of time order`);
          assert.ok(order.indexOf(station) > previousIndex);
          previousTime = time;
          previousIndex = order.indexOf(station);
        }
      }
    }
  }
});

test('Alajuela departure matches image 5, including the Río Segundo stop', () => {
  assert.deepEqual(routes[0].forward.find(trip => trip.hospital === '05:45'), {
    hospital: '05:45', aeropuerto: '05:50', riosegundo: '05:53', sanjoaquin: '06:02',
    sanfrancisco: '06:08', heredia: '06:11', miraflores: '06:14', santarosa: '06:19',
    colima: '06:24', calleblancos: '06:29', atlantico: '06:33',
  });
});

test('partial services stop where the supplied schedules stop', () => {
  assert.equal(routes[0].forward[0].ulatina, undefined);
  assert.equal(routes[1].forward.filter(trip => trip.paraiso).length, 2);
  assert.equal(routes[2].forward.filter(trip => trip.belen).length, 6);
  assert.equal(routes[2].backward.find(trip => trip.metropoli === '16:53').atlantico, '17:33');
  assert.equal(routes[1].backward.find(trip => trip.paraiso === '06:05').atlantico, '07:10');
});
