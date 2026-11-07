import test from "node:test";
import assert from "node:assert/strict";
import { routes } from "../data/schedules.mjs";
import { planJourneys, TRANSFER_MINUTES } from "../lib/transfers.mjs";

test("finds a cross-line journey from Heredia to Cartago automatically", () => {
  const result = planJourneys(
    routes,
    "heredia",
    "cartago",
    "2026-11-09",
    "06:00",
  );
  assert.equal(result.state, "ready");
  const best = result.upcoming[0];
  assert.equal(best.arrival, "07:28");
  assert.ok(best.transfers >= 1);
  assert.equal(best.legs[0].from, "heredia");
  assert.equal(best.legs.at(-1).to, "cartago");
  assert.equal(best.legs[0].routeId, "heredia");
  assert.equal(best.legs.at(-1).routeId, "cartago");
});

test("connects partial services instead of rejecting Hospital to Ulatina", () => {
  const result = planJourneys(
    routes,
    "hospital",
    "ulatina",
    "2026-11-09",
    "05:00",
  );
  assert.equal(result.state, "ready");
  assert.equal(result.upcoming[0].departure, "05:45");
  assert.ok(result.upcoming[0].transfers > 0);
});

test("all returned connections respect stop continuity and the transfer allowance", () => {
  for (const [from, to] of [
    ["hospital", "cartago"],
    ["heredia", "belen"],
    ["cartago", "hospital"],
    ["belen", "paraiso"],
  ]) {
    const result = planJourneys(routes, from, to, "2026-11-09", "00:00");
    assert.ok(result.upcoming.length, `${from} to ${to}`);
    for (const option of result.upcoming) {
      for (let i = 1; i < option.legs.length; i++) {
        const previous = option.legs[i - 1],
          next = option.legs[i];
        assert.equal(previous.to, next.from);
        const asMinutes = (time) =>
          Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
        assert.ok(
          asMinutes(next.departure) - asMinutes(previous.arrival) >=
            TRANSFER_MINUTES,
        );
      }
    }
  }
});

test("supports multiple transfers and rejects impossible tight connections", () => {
  const fixtures = [
    {
      id: "a",
      shortName: "A",
      stations: ["a", "b"],
      forward: [{ a: "06:00", b: "06:10" }],
      backward: [],
    },
    {
      id: "b",
      shortName: "B",
      stations: ["b", "c"],
      forward: [
        { b: "06:14", c: "06:20" },
        { b: "06:15", c: "06:25" },
      ],
      backward: [],
    },
    {
      id: "c",
      shortName: "C",
      stations: ["c", "d"],
      forward: [{ c: "06:30", d: "06:40" }],
      backward: [],
    },
  ];
  const best = planJourneys(fixtures, "a", "d", "2026-11-09", "06:00")
    .upcoming[0];
  assert.equal(best.transfers, 2);
  assert.equal(best.legs[1].departure, "06:15");
  assert.equal(best.arrival, "06:40");
  assert.equal(
    planJourneys(fixtures, "a", "d", "2026-11-09", "06:01").state,
    "finished",
  );
});

test("weekends, unknown stations and equal endpoints do not produce itineraries", () => {
  assert.equal(
    planJourneys(routes, "heredia", "cartago", "2026-11-07", "06:00").state,
    "weekend",
  );
  assert.equal(
    planJourneys(routes, "unknown", "cartago", "2026-11-09", "06:00").state,
    "invalid",
  );
  assert.equal(
    planJourneys(routes, "cartago", "cartago", "2026-11-09", "06:00").state,
    "same",
  );
});
