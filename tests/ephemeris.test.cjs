const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../ephemeris.js');
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const norm = p => Math.hypot(p.x, p.y, p.z);
const dot = (p, q) => p.x * q.x + p.y * q.y + p.z * q.z;

test('Horizons CSV parser maps named orbital columns, rejecting malformed output', () => {
  const rows = E.parseElements('header\n$$SOE\n2451545.0, A.D. 2000-Jan-01, 0.25, 750, 12, 33, 44, 2451540, 90, 180, 180, 1000, 1250, 4,\n$$EOE\nfooter');
  assert.deepEqual(rows[0], [2451545, 1000, .25, 12, 33, 44, 180, 90]);
  assert.throws(() => E.parseElements('No ephemeris'));
  assert.throws(() => E.parseElements('$$SOE\n1,garbage\n$$EOE'));
  assert.throws(() => E.parseElements('$$SOE\n2451545, date, .1, 900, , 0, 0, 2451540, 90, 0, 0, 1000, 1100, 4\n$$EOE'));
});

test('Circular orbit has correct phase, period, plane and retrograde direction', () => {
  const row = [2451545, 1000, 0, 0, 0, 0, 0, 90];
  close(E.propagate(row, row[0]).x, 1000);
  const quarter = E.propagate(row, row[0] + 1); close(quarter.x, 0); close(quarter.y, 1000);
  const full = E.propagate(row, row[0] + 4); close(full.x, 1000); close(full.y, 0);
  const retrograde = E.propagate([row[0], 1000, 0, 180, 0, 0, 0, 90], row[0] + 1);
  close(retrograde.y, -1000);
  const polar = E.propagate([row[0], 1000, 0, 90, 0, 0, 0, 90], row[0] + 1);
  close(polar.y, 0); close(polar.z, 1000);
});

test('Eccentric Kepler orbit retains physical radius and converges at high eccentricity', () => {
  for (const e of [.0167, .2056, .75, .99]) {
    const row = [2451545, 1000, e, 37, 123, 87, 0, 90];
    close(norm(E.propagate(row, row[0])), 1000 * (1 - e));
    close(norm(E.propagate(row, row[0] + 2)), 1000 * (1 + e));
    for (let step = 0; step < 20; step++) assert.ok(Number.isFinite(norm(E.propagate(row, row[0] + step / 10))));
    const periapsis = E.propagate(row, row[0]), apocenter = E.propagate(row, row[0] + 2);
    close(dot(periapsis, apocenter), -norm(periapsis) * norm(apocenter), 1e-6);
  }
});

test('Interpolation is continuous across wrapped angles, epochs and coverage edges', () => {
  const rows = [[2451545, 1000, .1, 5, 359, 359, 359, 90], [2451545.25, 1000, .1, 5, 1, 1, 17.5, 90], [2451545.5, 1000, .1, 5, 3, 3, 36, 90]];
  const data = { bodies: { body: { samples: rows } } };
  const at = E.position(data, 'body', rows[1][0]), expected = E.propagate(rows[1], rows[1][0]);
  close(at.x, expected.x); close(at.y, expected.y); close(at.z, expected.z);
  for (const jd of rows.map(row => row[0])) {
    const left = E.position(data, 'body', jd - 1e-8), right = E.position(data, 'body', jd + 1e-8);
    assert.ok(Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z) < .001);
  }
  assert.equal(E.coverage(data, ['body'], 2451545.25), true);
  assert.equal(E.coverage(data, ['body'], 2451544), false);
  assert.equal(E.coverage(data, ['body'], 2451546), false);
});

test('UTC timestamps are converted to Julian TDB with the stored time offset', () => {
  close(E.julianDay(Date.UTC(2000, 0, 1, 12), { utcToTdbSeconds: 69.184 }), 2451545 + 69.184 / 86400);
});

test('Incomplete, nonfinite and hyperbolic datasets cannot enter the renderer', () => {
  const base = { schema: 1, generatedAt: '2026-09-30T00:00:00Z', timeScale: 'TDB', referencePlane: 'ECLIPTIC', referenceSystem: 'ICRF', utcToTdbSeconds: 69.184,
    bodies: { body: { samples: [[2451545, 1000, .1, 90, 0, 0, 0, 90], [2451546, 1000, .1, 90, 0, 0, 90, 90]] } } };
  assert.equal(E.validateDataset(base, ['body']), base);
  assert.throws(() => E.validateDataset(base, ['missing']));
  for (const [column, value] of [[0, 2451545], [1, -10], [2, 1], [3, 181], [6, NaN], [7, 0]]) {
    const invalid = structuredClone(base); invalid.bodies.body.samples[1][column] = value;
    assert.throws(() => E.validateDataset(invalid, ['body']));
  }
});
