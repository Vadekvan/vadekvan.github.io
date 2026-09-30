(function (root) {
  'use strict';
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  function parseElements(raw) {
    const table = raw.split('$$SOE')[1]?.split('$$EOE')[0];
    if (!table) throw new Error('Missing Horizons elements table');
    return table.trim().split(/\r?\n/).filter(line => line.trim()).map(line => {
      const fields = line.split(',').map(field => field.trim());
      // Horizons CSV: JDTDB, date, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR.
      const row = [0, 11, 2, 4, 5, 6, 9, 8].map(index => fields[index] ? Number(fields[index]) : NaN);
      if (row.some(value => !Number.isFinite(value))) throw new Error('Invalid Horizons CSV row');
      return row.map((value, index) => Number(value.toFixed(index === 1 ? 6 : 10)));
    });
  }
  function validateDataset(data, expectedIds) {
    if (data?.schema !== 1 || data.timeScale !== 'TDB' || data.referencePlane !== 'ECLIPTIC' || data.referenceSystem !== 'ICRF' ||
        !Number.isFinite(data.utcToTdbSeconds) || !Number.isFinite(Date.parse(data.generatedAt))) throw new Error('Unsupported ephemeris dataset');
    for (const id of expectedIds) {
      const rows = data.bodies?.[id]?.samples;
      if (!rows || rows.length < 2) throw new Error(`Missing ephemeris: ${id}`);
      let previous = -Infinity;
      for (const row of rows) {
        if (row.length !== 8 || row.some(value => !Number.isFinite(value)) || row[0] <= previous || row[1] <= 0 || row[2] < 0 || row[2] >= 1 || row[3] < 0 || row[3] > 180 || row[7] <= 0) throw new Error(`Invalid orbital elements: ${id}`);
        previous = row[0];
      }
    }
    return data;
  }
  function julianDay(utcMs, data) { return utcMs / 86400000 + 2440587.5 + data.utcToTdbSeconds / 86400; }
  function bracket(rows, jd) {
    let low = 0, high = rows.length - 1;
    if (jd <= rows[0][0]) return [rows[0], rows[0]];
    if (jd >= rows[high][0]) return [rows[high], rows[high]];
    while (high - low > 1) { const mid = (low + high) >> 1; if (rows[mid][0] <= jd) low = mid; else high = mid; }
    return [rows[low], rows[high]];
  }
  function propagate(row, jd, anomaly) {
    const [epoch, a, e, inclination, node, periapsis, mean, motion] = row;
    // Reduce before solving to retain accuracy at fast simulation speeds.
    const m = anomaly ?? ((((mean + motion * (jd - epoch)) * DEG) % TAU + TAU) % TAU);
    let eccentric = e < .8 ? m : Math.PI;
    for (let i = 0; i < 15; i++) {
      const step = (eccentric - e * Math.sin(eccentric) - m) / (1 - e * Math.cos(eccentric));
      eccentric -= step; if (Math.abs(step) < 1e-12) break;
    }
    const x = a * (Math.cos(eccentric) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(eccentric);
    const cN = Math.cos(node * DEG), sN = Math.sin(node * DEG), cW = Math.cos(periapsis * DEG), sW = Math.sin(periapsis * DEG), cI = Math.cos(inclination * DEG), sI = Math.sin(inclination * DEG);
    return { x: (cN * cW - sN * sW * cI) * x + (-cN * sW - sN * cW * cI) * y,
      y: (sN * cW + cN * sW * cI) * x + (-sN * sW + cN * cW * cI) * y,
      z: sW * sI * x + cW * sI * y };
  }
  function position(data, id, jd) {
    const rows = data.bodies[id].samples;
    const [left, right] = bracket(rows, jd);
    const p = propagate(left, jd);
    if (left === right) return p;
    // Blend propagated positions, not wrapped angles: no jumps at 0/360° or epochs.
    const q = propagate(right, jd), t = (jd - left[0]) / (right[0] - left[0]);
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t };
  }
  function elements(data, id, jd) { const [a, b] = bracket(data.bodies[id].samples, jd); return jd - a[0] < b[0] - jd ? a : b; }
  function coverage(data, ids, jd) {
    return ids.every(id => { const rows = data.bodies[id].samples; return jd >= rows[0][0] && jd <= rows[rows.length - 1][0]; });
  }
  const api = { parseElements, validateDataset, julianDay, propagate, position, elements, coverage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AstraEphemeris = api;
})(typeof window === 'undefined' ? globalThis : window);
