import test from "node:test";
import assert from "node:assert/strict";
import { stationNames } from "../data/schedules.mjs";
import { coordinates } from "../data/coordinates.mjs";

test("every selectable station has a map coordinate from the GTFS source", () => {
  assert.deepEqual(
    Object.keys(coordinates).sort(),
    Object.keys(stationNames).sort(),
  );
  for (const [latitude, longitude] of Object.values(coordinates)) {
    assert.ok(latitude > 9 && latitude < 11);
    assert.ok(longitude > -85 && longitude < -83);
  }
});
