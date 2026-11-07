import assert from 'node:assert/strict';
import { messages, stationLabel } from '../src/i18n.mjs';
import { stationNames } from '../data/schedules.mjs';
assert.deepEqual(Object.keys(messages.en), Object.keys(messages.es));
for (const locale of Object.values(messages)) {
  for (const value of Object.values(locale)) assert.equal(typeof (typeof value === 'function' ? value(1, '06:00', '06:10', 10) : value), 'string');
}
for (const id of Object.keys(stationNames)) {
  assert.ok(stationLabel(id, 'en'));
  assert.equal(stationLabel(id, 'es'), stationNames[id]);
}
assert.equal(messages.en.transfers(1), '1 transfer');
assert.equal(messages.es.transfers(2), '2 transbordos');
