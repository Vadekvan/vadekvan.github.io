// Node 22+. Fetch JPL sequentially; publish only a complete, validated dataset.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { parseElements, validateDataset } = require('../ephemeris.js');
const root = path.resolve(__dirname, '..');
const ids = {
  mercury: 199, venus: 299, earth: 399, mars: 499, jupiter: 599, saturn: 699, uranus: 799, neptune: 899,
  moon: 301, phobos: 401, deimos: 402,
  io: 501, europa: 502, ganymede: 503, callisto: 504, amalthea: 505, himalia: 506, thebe: 514, adrastea: 515, metis: 516,
  mimas: 601, enceladus: 602, tethys: 603, dione: 604, rhea: 605, titan: 606, hyperion: 607, iapetus: 608, phoebe: 609,
  janus: 610, epimetheus: 611, helene: 612, atlas: 615, prometheus: 616, pandora: 617, pan: 618,
  ariel: 701, umbriel: 702, titania: 703, oberon: 704, miranda: 705,
  triton: 801, nereid: 802, naiad: 803, thalassa: 804, despina: 805, galatea: 806, larissa: 807, proteus: 808,
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const date = timestamp => new Date(timestamp).toISOString().slice(0, 10);

async function request(params) {
  const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ASTRA/1.0 (https://github.com/vadekvan/vadekvan.github.io; contact: https://github.com/vadekvan)' },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      // The live service can lag the documentation (1.2 and 1.3 share these columns).
      if (!['1.2', '1.3'].includes(result.signature?.version)) throw new Error(`Unsupported Horizons API version: ${result.signature?.version}`);
      if (result.error || !result.result?.includes('$$SOE')) throw new Error(result.error || 'Missing ephemeris table');
      return { raw: result.result, version: result.signature.version };
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Request failed (${error.message}); backing off before retry ${attempt + 1}.`);
      await delay(3000 * 2 ** attempt);
    }
  }
}

async function main() {
  const context = { window: {} };
  vm.runInNewContext(await fs.readFile(path.join(root, 'solar-system.js'), 'utf8'), context);
  const solar = context.window.SOLAR_SYSTEM;
  const targets = [...solar.planets.map(p => ({ id: p.id, center: 10, span: 400, step: '1 d' })),
    ...solar.moons.map(m => ({ id: m[0], center: ids[m[2]], span: 90, step: '6 h' }))];
  const day = Math.floor(Date.now() / 86400000) * 86400000;
  const dataset = { schema: 1, source: 'NASA/JPL Horizons', apiVersions: [], generatedAt: new Date().toISOString(),
    referencePlane: 'ECLIPTIC', referenceSystem: 'ICRF', timeScale: 'TDB', utcToTdbSeconds: 69.184,
    // [Julian day TDB, a km, e, inclination deg, ascending node deg, periapsis deg, mean anomaly deg, mean motion deg/day]
    columns: ['jd', 'a', 'e', 'i', 'node', 'periapsis', 'meanAnomaly', 'meanMotion'], bodies: {} };
  const cacheDir = path.join(root, '.qa', 'horizons-cache');
  await fs.mkdir(cacheDir, { recursive: true });
  for (const [index, target] of targets.entries()) {
    const params = { format: 'json', COMMAND: `'${ids[target.id]}'`, CENTER: `'500@${target.center}'`,
      MAKE_EPHEM: 'YES', OBJ_DATA: 'NO', EPHEM_TYPE: 'ELEMENTS', REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF',
      OUT_UNITS: 'KM-D', CSV_FORMAT: 'YES', TIME_TYPE: 'TDB',
      START_TIME: `'${date(day - target.span * 86400000)}'`, STOP_TIME: `'${date(day + target.span * 86400000)}'`, STEP_SIZE: `'${target.step}'` };
    // Resume an interrupted local run without repeating successful requests.
    const cacheFile = path.join(cacheDir, `${date(day)}-${target.id}.json`);
    let rows, version;
    try { const cache = JSON.parse(await fs.readFile(cacheFile, 'utf8')); if (JSON.stringify(cache.params) === JSON.stringify(params)) { rows = cache.rows; version = cache.version; } } catch { /* fetch */ }
    if (!rows) {
      const response = await request(params); const raw = response.raw; version = response.version;
      if (!raw.includes(`(${ids[target.id]})`) || !raw.includes(`(${target.center})`)) throw new Error(`Unexpected target/center for ${target.id}`);
      rows = parseElements(raw);
      await fs.writeFile(cacheFile, JSON.stringify({ params, rows, version }));
      await delay(400);
    }
    const expected = target.span * 2 * (target.step === '6 h' ? 4 : 1) + 1;
    if (rows.length !== expected) throw new Error(`${target.id}: expected ${expected} rows, got ${rows.length}`);
    if (!dataset.apiVersions.includes(version)) dataset.apiVersions.push(version);
    dataset.bodies[target.id] = { horizonsId: ids[target.id], centerId: target.center, samples: rows };
    console.log(`${index + 1}/${targets.length} ${target.id}: ${rows.length} epochs`);
  }
  validateDataset(dataset, targets.map(t => t.id));
  const outputDir = path.join(root, 'assets', 'data');
  await fs.mkdir(outputDir, { recursive: true });
  const destination = path.join(outputDir, 'ephemeris-data.js');
  const temporary = destination + '.tmp';
  await fs.writeFile(temporary, `// Generated by scripts/update-ephemeris.cjs from NASA/JPL Horizons.\nwindow.ASTRA_EPHEMERIS=${JSON.stringify(dataset)};\n`);
  await fs.rename(temporary, destination);
  console.log(`Saved ${targets.length} bodies to assets/data/ephemeris-data.js`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
