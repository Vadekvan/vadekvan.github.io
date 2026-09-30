const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../ephemeris.js');
const context = { window: {} }, root = path.resolve(__dirname, '..');
for (const file of ['solar-system.js', 'assets/data/ephemeris-data.js']) vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const solar = context.window.SOLAR_SYSTEM, data = context.window.ASTRA_EPHEMERIS;
const ids = [...solar.planets.map(p => p.id), ...solar.moons.map(m => m[0])];

test('Every displayed planet and moon has a complete, compatible Horizons dataset', () => {
  E.validateDataset(data, ids);
  assert.equal(Object.keys(data.bodies).length, 49);
  assert.ok(data.apiVersions.every(version => ['1.2', '1.3'].includes(version)));
  const generated = E.julianDay(Date.parse(data.generatedAt), data);
  assert.equal(E.coverage(data, ids, generated), true);
  for (const id of ids) {
    const record = data.bodies[id], rows = record.samples;
    const planet = solar.planets.find(p => p.id === id);
    assert.equal(record.centerId, planet ? 10 : data.bodies[solar.moons.find(m => m[0] === id)[2]].horizonsId);
    assert.equal(rows.length, planet ? 801 : 721);
    assert.ok(Math.abs(rows[1][0] - rows[0][0] - (planet ? 1 : .25)) < 1e-8);
    const pos = E.position(data, id, generated), radius = Math.hypot(pos.x, pos.y, pos.z);
    const nominal = planet ? planet.au * solar.auKm : solar.moons.find(m => m[0] === id)[4];
    assert.ok(radius > nominal * .15 && radius < nominal * 2.1, `${id}: plausible centered physical distance`);
  }
});

test('Retrograde satellites and highly eccentric Nereid retain their JPL geometry', () => {
  for (const id of ['triton', 'phoebe']) assert.ok(data.bodies[id].samples.every(row => row[3] > 90), `${id}: retrograde inclination`);
  assert.ok(data.bodies.nereid.samples.every(row => row[2] > .7));
  const generated = E.julianDay(Date.parse(data.generatedAt), data);
  const uranusMoons = solar.moons.filter(m => m[2] === 'uranus');
  for (const moon of uranusMoons) assert.ok(E.elements(data, moon[0], generated)[3] > 90, `${moon[0]}: Uranus equatorial plane`);
});
