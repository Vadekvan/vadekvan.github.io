(() => {
  'use strict';
  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  let paused = motionPreference.matches;
  let showOrbits = true;
  let width = 0, height = 0, dpr = 1, time = 0, effectsTime = 0, lastFrame = 0;
  let zoom = 1, targetZoom = 1, selected = null, hovered = null;
  let background, frameId, toastTimeout, sound = null;
  let trueDistances = false, showMoons = true, cameraX = 0, cameraY = 0, trackedPosition = null;
  // Each step expresses simulated time per real second, across useful scales.
  const speedOptions = [
    { days: 1 / 86400, value: '1', unit: 's/s', description: 'Skutečný čas · 1 sekunda za sekundu' },
    { days: 1 / 1440, value: '1', unit: 'min/s', description: '1 minuta za sekundu' },
    { days: 1 / 24, value: '1', unit: 'h/s', description: '1 hodina za sekundu' },
    { days: .25, value: '6', unit: 'h/s', description: '6 hodin za sekundu' },
    { days: .5, value: '12', unit: 'h/s', description: '12 hodin za sekundu' },
    { days: 1, value: '1', unit: 'd/s', description: '1 den za sekundu' },
    { days: 2, value: '2', unit: 'd/s', description: '2 dny za sekundu · výchozí tempo' },
    { days: 7, value: '7', unit: 'd/s', description: '1 týden za sekundu' },
    { days: 30, value: '30', unit: 'd/s', description: '30 dní za sekundu' },
    { days: 365.256, value: '1', unit: 'r/s', description: '1 rok za sekundu · jeden oběh Země' },
    { days: 3652.56, value: '10', unit: 'r/s', description: '10 let za sekundu' },
    { days: 36525.6, value: '100', unit: 'r/s', description: '100 let za sekundu · i vnější planety v pohybu' },
  ];
  let speedIndex = 6;
  const MIN_ZOOM = .00001, MAX_ZOOM = 2000000;
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0, active: false };
  const meteors = [], ripples = [], touches = new Map();
  let pinchDistance = 0;

  const data = window.SOLAR_SYSTEM;
  const format = (number, digits = 0) => number.toLocaleString('cs-CZ', { maximumFractionDigits: digits });
  const sun = { id: 'sun', name: 'Slunce', diameterKm: data.sunDiameterKm, color: '#f5cf91', kind: 'HVĚZDA · SRDCE NAŠÍ SOUSTAVY', description: 'Slunce má přibližně 109krát větší průměr než Země a desetkrát větší než Jupiter. V jeho nitru jaderná fúze mění vodík na helium. Září na všechny planety a určuje jejich denní a noční stranu.', facts: [['Průměr', `${format(data.sunDiameterKm)} km`], ['Poměr k Zemi', '109 : 1'], ['Teplota povrchu', '≈ 5 500 °C']] };
  const planets = data.planets.map((body, index) => ({ ...body, index, moons: [], facts: [['Průměr', `${format(body.diameterKm)} km`], ['Od Slunce', `${format(body.au, 3)} AU`], ['Doba oběhu', `${format(body.period, 2)} dní`]] }));
  sun.moons = [];
  const bodyById = new Map([sun, ...planets].map(body => [body.id, body]));
  const moonNotes = {
    moon: 'Náš jediný přirozený měsíc. Jeho povrch pokrývají krátery a tmavá lávová moře. K Zemi obrací stále stejnou stranu.',
    phobos: 'Malý nepravidelný měsíc, který obíhá blízko Marsu. Jeho povrch zdobí velký kráter Stickney.',
    deimos: 'Menší z dvojice měsíců Marsu. Má nepravidelný tvar a pomalejší, vzdálenější dráhu než Phobos.',
    io: 'Vulkanicky aktivní měsíc se žlutavým povrchem pokrytým sloučeninami síry.',
    europa: 'Ledová kůra protkána prasklinami ukrývá podzemní oceán.',
    ganymede: 'Největší měsíc Sluneční soustavy. Je větší než Merkur a má vlastní magnetické pole.',
    callisto: 'Prastarý povrch hustě posetý impaktními krátery.',
    titan: 'Největší Saturnův měsíc. Hustá oranžová atmosféra zakrývá jezera kapalného metanu a ethanu.',
    enceladus: 'Jasný ledový měsíc, jehož jižní pól chrlí gejzíry z podpovrchového oceánu.',
    triton: 'Ledový měsíc, který obíhá v opačném směru než většina ostatních měsíců. Pravděpodobně byl Neptunem zachycen.',
  };
  const moons = data.moons.map(([id, name, parentId, diameterKm, orbitKm, period, color], index) => {
    const parent = bodyById.get(parentId);
    const body = { id, name, parentId, parent, diameterKm, orbitKm, period, color: color || '#b0b0a6', phase: index * 2.39996 + 1.9, kind: `PŘIROZENÝ MĚSÍC · ${parent.name.toLocaleUpperCase('cs')}`, description: moonNotes[id] || `${name} patří do soustavy měsíců planety ${parent.name}. V modelu má skutečný poměr velikosti k mateřské planetě; pro detail ho můžeš samostatně přiblížit.`, facts: [['Průměr', `${format(diameterKm, 2)} km`], ['Dráha od středu planety', `${format(orbitKm)} km`], ['Doba oběhu', `${format(Math.abs(period), 3)} dne`]] };
    parent.moons.push(body); bodyById.set(id, body); return body;
  });
  const bodies = [sun, ...planets, ...moons];
  let seed = 14728;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const stars = Array.from({ length: 1200 }, () => ({ x: random(), y: random(), radius: .3 + random() * 1.25, brightness: .2 + random() * .65, phase: random() * Math.PI * 2, depth: .1 + random() * .9, warm: random() > .8 }));
  const asteroids = Array.from({ length: 150 }, () => ({ angle: random() * Math.PI * 2, au: 2.1 + random() * 1.2, size: .3 + random() ** 3 * 1.7, shape: Array.from({ length: 7 }, () => .6 + random() * .4) }));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  function hash(x, y, z) { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let fx = x - ix, fy = y - iy, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    return mix(mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy), mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz);
  }
  function terrain(x, y, z) { return noise(x * 2.8 + 11, y * 2.8 + 4, z * 2.8 + 7) * .58 + noise(x * 6 + 2, y * 6, z * 6) * .27 + noise(x * 14, y * 14, z * 14) * .15; }
  function makeTexture(body) {
    const size = body.parentId ? 128 : 320;
    const texture = document.createElement('canvas'); texture.width = texture.height = size;
    const context = texture.getContext('2d'); const pixels = context.createImageData(size, size);
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const x = (px + .5) / size * 2 - 1, y = (py + .5) / size * 2 - 1;
      const distance = x * x + y * y; if (distance >= 1) continue;
      const z = Math.sqrt(1 - distance), n = terrain(x, y, z);
      let color;
      if (body.id === 'earth') {
        const land = terrain(x * 1.5 - .8, y * 1.4 + .5, z + .4);
        color = land > .51 ? [107 + n * 90, 126 + n * 66, 94 + n * 48] : [22 + n * 20, 65 + n * 45, 76 + n * 54];
        const cloud = noise(x * 8 + n * 3, y * 10 + n * 2, z * 7);
        const coverage = clamp((cloud - .56) * 3, 0, .7);
        color = color.map((c) => mix(c, 218, coverage));
        if (Math.abs(y + x * .22) > .91) color = [183 + n * 50, 195 + n * 40, 184 + n * 40];
      } else if (body.id === 'jupiter' || body.id === 'saturn') {
        const bands = Math.sin(y * (body.id === 'jupiter' ? 42 : 65) + noise(x * 7, y * 9, z * 5) * 3);
        color = body.id === 'jupiter' ? [170 + bands * 34 + n * 22, 141 + bands * 35 + n * 25, 110 + bands * 28 + n * 22] : [179 + bands * 15 + n * 25, 167 + bands * 17 + n * 22, 127 + bands * 17 + n * 22];
        if (body.id === 'jupiter' && ((x + .33) ** 2 / .025 + (y - .27) ** 2 / .007) < 1) color = [177 + n * 25, 102 + n * 23, 73 + n * 15];
      } else if (body.id === 'mars') color = [152 + n * 69, 76 + n * 50, 47 + n * 44];
      else if (body.id === 'venus' || body.id === 'titan') color = [190 + n * 45, 163 + n * 50, 100 + n * 70];
      else if (body.id === 'uranus') color = [119 + n * 30, 178 + n * 25, 183 + n * 25];
      else if (body.id === 'neptune') color = [75 + n * 30, 125 + n * 35, 168 + n * 35];
      else if (body.id === 'io') color = [172 + n * 65, 151 + n * 50, 77 + n * 40];
      else color = [99 + n * 110, 104 + n * 106, 97 + n * 99];
      const shade = .85 + z * .15;
      const rim = body.id === 'earth' ? Math.pow(1 - z, 5) * .5 * Math.max(0, -x + .2) : 0;
      const index = (py * size + px) * 4;
      pixels.data[index] = color[0] * shade + rim * 60;
      pixels.data[index + 1] = color[1] * shade + rim * 145;
      pixels.data[index + 2] = color[2] * shade + rim * 166;
      pixels.data[index + 3] = clamp((1 - distance) * size * 1.2, 0, 1) * 255;
    }
    context.putImageData(pixels, 0, 0); return texture;
  }
  for (const body of bodies) if (body.id !== 'sun') body.texture = makeTexture(body);

  // Project equirectangular surface maps onto spheres. Assets stay local and
  // procedural maps remain available if a photo cannot be loaded.
  function projectMap(body, source) {
    const size = body.id === 'sun' ? 512 : 400;
    const texture = document.createElement('canvas'); texture.width = texture.height = size;
    const context = texture.getContext('2d');
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = source.naturalWidth; sourceCanvas.height = source.naturalHeight;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true }); sourceContext.drawImage(source, 0, 0);
    let sourcePixels;
    try { sourcePixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data; } catch { /* file:// origins use drawImage tiles instead */ }
    const pixels = sourcePixels ? context.createImageData(size, size) : null;
    const step = sourcePixels ? 1 : 2;
    context.save(); context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip();
    for (let py = 0; py < size; py += step) for (let px = 0; px < size; px += step) {
      const x = (px + step / 2) / size * 2 - 1, y = (py + step / 2) / size * 2 - 1, distance = x * x + y * y;
      if (distance >= 1) continue;
      const z = Math.sqrt(1 - distance);
      const u = ((Math.atan2(x, z) / (2 * Math.PI) + .5 + (body.id === 'earth' ? .06 : .13)) % 1 + 1) % 1;
      const v = .5 + Math.asin(y) / Math.PI;
      const sx = Math.min(sourceCanvas.width - 1, Math.floor(u * sourceCanvas.width)), sy = Math.min(sourceCanvas.height - 1, Math.floor(v * sourceCanvas.height));
      if (pixels) {
        const from = (sy * sourceCanvas.width + sx) * 4, to = (py * size + px) * 4;
        for (let channel = 0; channel < 3; channel++) pixels.data[to + channel] = sourcePixels[from + channel];
        if (body.id === 'earth') { const cloud = clamp((noise(x * 9 + 1, y * 15, z * 8) - .62) * 3.8, 0, .8); for (let channel = 0; channel < 3; channel++) pixels.data[to + channel] = mix(pixels.data[to + channel], 239, cloud); }
        pixels.data[to + 3] = clamp((1 - distance) * size, 0, 1) * 255;
      } else context.drawImage(source, sx, sy, 1, 1, px, py, step, step);
    }
    if (pixels) context.putImageData(pixels, 0, 0);
    context.restore(); body.texture = texture; body.hasSurfaceMap = true;
  }
  for (const body of [sun, ...planets, bodyById.get('moon')]) {
    const photo = new Image(); photo.onload = () => projectMap(body, photo); photo.src = `assets/textures/${body.id}.jpg`;
  }

  const shadeCache = new Map();
  function sphereShadow(body, base) {
    const lightBase = body.parentId ? basePosition(body.parent) : base;
    const length = Math.hypot(lightBase.x, lightBase.y, lightBase.z || 0) || 1;
    const tilt = body.tilt || 0;
    const lx = (-lightBase.x * Math.cos(tilt) - lightBase.y * Math.sin(tilt)) / length;
    const ly = (lightBase.x * Math.sin(tilt) - lightBase.y * Math.cos(tilt)) / length;
    const lz = -(lightBase.z || 0) / length;
    const angle = Math.round(Math.atan2(ly, lx) * 12 / Math.PI), phase = Math.round(lz * 5);
    const key = `${angle}:${phase}`;
    if (shadeCache.has(key)) return shadeCache.get(key);
    const size = 128, shade = document.createElement('canvas'); shade.width = shade.height = size;
    const context = shade.getContext('2d'), pixels = context.createImageData(size, size);
    const a = angle * Math.PI / 12, zLight = phase / 5, xyLight = Math.sqrt(1 - zLight * zLight);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + .5) / size * 2 - 1, ny = (y + .5) / size * 2 - 1, d = nx * nx + ny * ny;
      if (d >= 1) continue;
      const nz = Math.sqrt(1 - d), lambert = Math.max(0, nx * Math.cos(a) * xyLight + ny * Math.sin(a) * xyLight + nz * zLight);
      pixels.data[(y * size + x) * 4 + 3] = (1 - (.028 + .972 * Math.pow(lambert, .72))) * 255 * clamp((1 - d) * size, 0, 1);
    }
    context.putImageData(pixels, 0, 0); shadeCache.set(key, shade); return shade;
  }

  function makeBackground() {
    background = document.createElement('canvas'); background.width = Math.min(width, 1600); background.height = Math.min(height, 1000);
    const c = background.getContext('2d'), w = background.width, h = background.height;
    c.fillStyle = '#070c0d'; c.fillRect(0, 0, w, h);
    const clouds = [[.69, .45, .4, 'rgba(45,80,64,.19)'], [.82, .75, .34, 'rgba(67,69,36,.15)'], [.45, .44, .27, 'rgba(103,67,43,.09)'], [.62, .08, .35, 'rgba(25,65,61,.14)']];
    for (const [x, y, radius, color] of clouds) { const gradient = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, radius * w); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent'); c.fillStyle = gradient; c.fillRect(0, 0, w, h); }
    for (let i = 0; i < 11000; i++) {
      const x = random(), y = .96 - x * .85 + (random() + random() + random() - 1.5) * .23;
      c.fillStyle = `rgba(148,166,136,${random() * .055})`; c.fillRect(x * w, y * h, random() * 1.5 + .2, random() * 1.5 + .2);
    }
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeBackground();
  }
  function basePosition(body) {
    const r = sunRadius() * body.diameterKm / data.sunDiameterKm;
    if (body === sun) return { x: 0, y: 0, z: 0, r };
    if (body.parentId) {
      const parent = basePosition(body.parent);
      const radius = trueDistances ? body.orbitKm * sunRadius() * 2 / data.sunDiameterKm : parent.r * (1.8 + Math.log2(1 + body.orbitKm / (body.parent.diameterKm / 2)) * .45);
      const orbit = orbitalPoint(radius, body.phase + time * 2 * Math.PI / body.period, 0, body.parentId === 'uranus' ? 1.05 : -.28);
      return { x: parent.x + orbit.x, y: parent.y + orbit.y, z: parent.z + orbit.z, r };
    }
    const meanAnomaly = body.phase + time * 2 * Math.PI / body.period;
    let eccentricAnomaly = meanAnomaly;
    for (let i = 0; i < 5; i++) eccentricAnomaly -= (eccentricAnomaly - body.eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - body.eccentricity * Math.cos(eccentricAnomaly));
    const angle = Math.atan2(Math.sqrt(1 - body.eccentricity ** 2) * Math.sin(eccentricAnomaly), Math.cos(eccentricAnomaly) - body.eccentricity);
    const orbit = orbitalPoint(orbitRadius(body), angle, body.eccentricity);
    return { ...orbit, r };
  }
  function layoutScale() { return width <= 760 ? Math.min(width * .31, height * .22) : Math.min(width * .255, height * .36); }
  function sunRadius() { return layoutScale() * .4; }
  function orbitRadius(body) { return trueDistances ? body.au * data.auKm * sunRadius() * 2 / data.sunDiameterKm : layoutScale() * [.56, .64, .72, .82, 1, 1.1, 1.22, 1.35][body.index]; }
  function orbitalPoint(radius, angle, eccentricity = 0, rotation = -.2) {
    const radial = radius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(angle));
    const x = Math.cos(angle) * radial, y = Math.sin(angle) * radial * .72;
    return { x: x * Math.cos(rotation) - y * Math.sin(rotation), y: x * Math.sin(rotation) + y * Math.cos(rotation), z: Math.sin(angle) * radial * Math.sqrt(1 - .72 ** 2) };
  }
  function anchor() { return { x: width * (width <= 760 ? selected ? .73 : .54 : .67), y: height * (width <= 760 ? selected ? .635 : .565 : .475) }; }
  function position(body) {
    const base = basePosition(body);
    const center = anchor();
    return { x: (base.x - cameraX) * zoom + center.x + pointer.smoothX * 16,
      y: (base.y - cameraY) * zoom + center.y + pointer.smoothY * 12, r: base.r * zoom, z: base.z };
  }
  function ring(body, p, front) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(body.id === 'uranus' ? 1.15 : -.38); ctx.scale(1, body.id === 'uranus' ? .65 : .34);
    const major = body.ring === 'saturn', count = major ? 48 : 5;
    for (let i = 0; i < count; i++) {
      const radius = p.r * (major ? 1.25 + i * .025 : 1.7 + i * .07);
      const gap = major && radius / p.r > 1.94 && radius / p.r < 2.03;
      ctx.beginPath(); ctx.arc(0, 0, radius, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = `rgba(195,183,151,${gap ? .02 : major ? .19 + Math.sin(i * 1.7) * .065 : body.ring === 'faint' ? .025 : .1})`; ctx.lineWidth = p.r * (major ? .023 : .012); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBody(body) {
    const p = position(body); body.screen = p;
    const extent = p.r * (body.ring ? 2.6 : 1.12);
    if (p.x + extent < 0 || p.x - extent > width || p.y + extent < 0 || p.y - extent > height || p.r < .02) return;
    if (body.id === 'sun') {
      const glow = ctx.createRadialGradient(p.x, p.y, p.r * .85, p.x, p.y, p.r * 2.8);
      glow.addColorStop(0, '#f9cb806b'); glow.addColorStop(.18, '#e6b15a30'); glow.addColorStop(.5, '#c6853210'); glow.addColorStop(1, '#ad793900'); ctx.fillStyle = glow; ctx.fillRect(p.x - p.r * 2.8, p.y - p.r * 2.8, p.r * 5.6, p.r * 5.6);
      const surface = ctx.createRadialGradient(p.x - p.r * .3, p.y - p.r * .3, 0, p.x, p.y, p.r); surface.addColorStop(0, '#fff2c4'); surface.addColorStop(.65, '#f4cf91'); surface.addColorStop(.9, '#d99550'); surface.addColorStop(1, '#a9652d'); ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      if (body.texture) { ctx.drawImage(body.texture, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); ctx.save(); ctx.globalCompositeOperation = 'screen'; const illumination = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); illumination.addColorStop(0, '#fff3cdba'); illumination.addColorStop(.7, '#ffeab68a'); illumination.addColorStop(1, '#ffce7950'); ctx.fillStyle = illumination; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.clip();
      if (!body.texture) for (let i = 0; i < 160; i++) { const angle = i * 2.39996, radius = Math.sqrt(i / 160) * p.r; ctx.fillStyle = `rgba(149,80,26,${.06 + Math.sin(i + effectsTime * .2) * .025})`; ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius, p.r * .035, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    } else {
      if (body.ring) ring(body, p, false);
      if (body.id === 'earth') { const glow = ctx.createRadialGradient(p.x, p.y, p.r * .94, p.x, p.y, p.r * 1.12); glow.addColorStop(0, '#8abeb625'); glow.addColorStop(.5, '#68a5a010'); glow.addColorStop(1, '#689f9900'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.12, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(body.tilt || 0); ctx.scale(1, 1 - (body.flattening || 0));
      if (body.id === 'phobos' || body.id === 'deimos' || body.id === 'hyperion') ctx.scale(1.2, .82);
      ctx.drawImage(body.texture, -p.r, -p.r, p.r * 2, p.r * 2);
      ctx.drawImage(sphereShadow(body, basePosition(body)), -p.r, -p.r, p.r * 2, p.r * 2); ctx.restore();
      if (body.ring) ring(body, p, true);
    }
    if (hovered === body || selected === body) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2); ctx.strokeStyle = '#e6b48b60'; ctx.lineWidth = .7; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
      for (let a = 0; a < 4; a++) { const angle = a * Math.PI / 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(angle) * (p.r + 8), p.y + Math.sin(angle) * (p.r + 8)); ctx.lineTo(p.x + Math.cos(angle) * (p.r + 15), p.y + Math.sin(angle) * (p.r + 15)); ctx.strokeStyle = '#e6b48bb0'; ctx.stroke(); }
    }
  }
  function drawOrbits() {
    if (!showOrbits) return;
    const center = position(sun);
    for (const planet of planets) {
      const radius = orbitRadius(planet) * zoom;
      if (radius > Math.max(width, height) * 6) continue;
      ctx.beginPath();
      for (let i = 0; i <= 128; i++) { const p = orbitalPoint(radius, i / 128 * Math.PI * 2, planet.eccentricity); if (i === 0) ctx.moveTo(center.x + p.x, center.y + p.y); else ctx.lineTo(center.x + p.x, center.y + p.y); }
      ctx.strokeStyle = '#adb9a928'; ctx.lineWidth = .65; ctx.stroke();
    }
    if (!showMoons) return;
    const parent = selected?.parent || selected;
    if (!parent?.moons?.length) return;
    const p = position(parent);
    for (const moon of parent.moons) {
      const radius = (trueDistances ? moon.orbitKm * sunRadius() * 2 / data.sunDiameterKm : basePosition(parent).r * (1.8 + Math.log2(1 + moon.orbitKm / (parent.diameterKm / 2)) * .45)) * zoom;
      if (radius > Math.max(width, height) * 4) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(parent.id === 'uranus' ? 1.05 : -.28); ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * .72, 0, 0, Math.PI * 2); ctx.setLineDash([2, 5]); ctx.strokeStyle = '#a9bcab28'; ctx.lineWidth = .6; ctx.stroke(); ctx.restore();
    }
  }
  function addMeteor(x, y, burst = false) {
    const angle = burst ? -Math.PI * .5 + (random() - .5) * 2.9 : Math.PI * .76;
    const speed = burst ? 230 + random() * 260 : 160 + random() * 180;
    meteors.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 1.1 + random() * 1.5, length: burst ? 35 + random() * 75 : 85 + random() * 95, size: random() * 1.3 + .5 });
    if (meteors.length > 90) meteors.shift();
  }
  function drawAsteroids() {
    const center = position(sun);
    if (selected && zoom > 4) return;
    for (const rock of asteroids) {
      const radius = trueDistances ? rock.au * data.auKm * sunRadius() * 2 / data.sunDiameterKm : layoutScale() * (.85 + (rock.au - 2.1) / 1.2 * .1);
      const p = orbitalPoint(radius * zoom, rock.angle + time * 2 * Math.PI / (365.256 * rock.au ** 1.5));
      const x = center.x + p.x, y = center.y + p.y;
      if (x < 0 || x > width || y < 0 || y > height) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rock.angle + effectsTime * .12); ctx.beginPath();
      for (let i = 0; i < rock.shape.length; i++) { const a = i / rock.shape.length * Math.PI * 2, r = rock.size * Math.min(zoom, 3) * rock.shape[i]; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fillStyle = '#7c817074'; ctx.strokeStyle = '#c1b79a59'; ctx.lineWidth = .4; ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  function drawMeteors(dt) {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.age += dt;
      if (m.age > m.life) { meteors.splice(i, 1); continue; }
      const alpha = Math.sin(Math.min(m.age / m.life, 1) * Math.PI) * .85, speed = Math.hypot(m.vx, m.vy);
      const endX = m.x - m.vx / speed * m.length, endY = m.y - m.vy / speed * m.length;
      const trail = ctx.createLinearGradient(endX, endY, m.x, m.y); trail.addColorStop(0, 'rgba(207,192,155,0)'); trail.addColorStop(.8, `rgba(190,201,180,${alpha * .35})`); trail.addColorStop(1, `rgba(243,230,193,${alpha})`);
      ctx.strokeStyle = trail; ctx.lineWidth = m.size; ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.fillStyle = `rgba(252,236,199,${alpha})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = ripples.length - 1; i >= 0; i--) { const ripple = ripples[i]; ripple.age += dt; if (ripple.age > 1.3) { ripples.splice(i, 1); continue; } ctx.beginPath(); ctx.arc(ripple.x, ripple.y, ripple.age * 75, 0, Math.PI * 2); ctx.strokeStyle = `rgba(230,180,139,${(1 - ripple.age / 1.3) * .3})`; ctx.lineWidth = .7; ctx.stroke(); }
  }
  let nextMeteor = 1.6;
  function drawLabels() {
    const focusParent = selected?.parent || selected;
    const occupiedLabels = [];
    for (const body of bodies) {
      body.labelRect = null;
      if (body.parentId && (!showMoons || body.parent !== focusParent || (body.diameterKm < 300 && body !== selected && body !== hovered))) continue;
      const p = body.screen;
      if (!p || p.x < 18 || p.x > width - 18 || p.y < 100 || p.y > height - 185) continue;
      if (body.parentId && p.r < .45) continue;
      if (trueDistances && !selected && body !== sun && Math.hypot(p.x - sun.screen.x, p.y - sun.screen.y) < 30) continue;
      if (body !== sun && p.z < 0 && Math.hypot(p.x - sun.screen.x, p.y - sun.screen.y) < sun.screen.r) continue;
      const label = body.name.toLocaleUpperCase('cs');
      ctx.font = `${width <= 760 ? 8 : 9}px "Space Grotesk", sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const leftSide = p.x + p.r + textWidth + 15 > width - 14;
      const labelX = clamp(leftSide ? p.x - p.r - textWidth - 15 : p.x + p.r + 15, 12, width - textWidth - 12);
      let labelY = body === sun ? p.y + p.r + 22 : p.y + 3;
      if (body !== sun) for (let attempt = 0; attempt < 4; attempt++) {
        if (!occupiedLabels.some(rect => labelX < rect.x + rect.w + 3 && labelX + textWidth > rect.x - 3 && labelY > rect.y - 12 && labelY < rect.y + 12)) break;
        labelY += 14;
      }
      ctx.fillStyle = body === selected || body === hovered ? '#efc49e' : '#bdc6b9';
      if (body === sun) { const text = label + ' · 109× ZEMĚ'; ctx.textAlign = 'center'; ctx.fillText(text, p.x, labelY); ctx.textAlign = 'left'; occupiedLabels.push({ x: p.x - ctx.measureText(text).width / 2, y: labelY, w: ctx.measureText(text).width }); }
      else {
        if (p.r < 5) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.strokeStyle = '#c0c8b943'; ctx.lineWidth = .6; ctx.stroke(); }
        ctx.fillText(label, labelX, labelY);
        body.labelRect = { x: labelX - 4, y: labelY - 13, w: textWidth + 8, h: 23 };
        occupiedLabels.push({ x: labelX, y: labelY, w: textWidth });
      }
    }
  }
  function render(timestamp) {
    if (motionPreference.matches !== reducedMotion) applyMotionPreference(motionPreference.matches);
    const elapsed = Math.max(0, (timestamp - (lastFrame || timestamp)) / 1000);
    const realDt = Math.min(elapsed, .05); lastFrame = timestamp;
    const dt = paused ? 0 : realDt;
    time += (paused ? 0 : elapsed) * speedOptions[speedIndex].days;
    effectsTime += dt;
    const ease = 1 - Math.exp(-realDt * 4);
    pointer.smoothX = mix(pointer.smoothX, pointer.x, ease); pointer.smoothY = mix(pointer.smoothY, pointer.y, ease);
    zoom = motionPreference.matches ? targetZoom : Math.exp(mix(Math.log(zoom), Math.log(targetZoom), ease));
    let targetX = 0, targetY = 0;
    if (selected) {
      const p = basePosition(selected);
      if (trackedPosition) { cameraX += p.x - trackedPosition.x; cameraY += p.y - trackedPosition.y; }
      trackedPosition = p; targetX = p.x; targetY = p.y;
    }
    const cameraEase = motionPreference.matches ? 1 : 1 - Math.exp(-realDt * (selected ? 12 : 8));
    cameraX = mix(cameraX, targetX, cameraEase); cameraY = mix(cameraY, targetY, cameraEase);
    if (Math.abs(zoom - targetZoom) < targetZoom * .00001) zoom = targetZoom;
    if (Math.abs(cameraX - targetX) < .00001) cameraX = targetX;
    if (Math.abs(cameraY - targetY) < .00001) cameraY = targetY;
    ctx.drawImage(background, 0, 0, width, height);
    for (const star of stars) {
      let x = star.x * width + pointer.smoothX * star.depth * 14, y = star.y * height + pointer.smoothY * star.depth * 11;
      const alpha = star.brightness * (.78 + Math.sin(effectsTime + star.phase) * .22);
      ctx.fillStyle = star.warm ? `rgba(218,194,153,${alpha})` : `rgba(199,214,206,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, star.radius * (width <= 760 ? .7 : 1), 0, Math.PI * 2); ctx.fill();
      if (star.radius > 1.45 && star.brightness > .7) { ctx.strokeStyle = `rgba(219,230,211,${alpha * .26})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
    }
    drawOrbits();
    drawAsteroids();
    const visibleBodies = bodies.filter(body => !body.parentId || showMoons || body === selected);
    // Far side first: foreground planets transit the Sun, background objects
    // are occluded by it. The same depth ordering applies to satellite systems.
    visibleBodies.sort((a, b) => basePosition(a).z - basePosition(b).z);
    for (const body of visibleBodies) drawBody(body);
    drawLabels();
    nextMeteor -= dt; if (nextMeteor <= 0) { addMeteor(width * (.5 + random() * .55), height * random() * .45); nextMeteor = 2.6 + random() * 3; }
    drawMeteors(dt);
    if (hovered && pointer.active) updateHoverLabel(hovered);
    frameId = requestAnimationFrame(render);
  }

  function notify(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 2600); }
  function updateHoverLabel(body) { const p = body.screen; const label = $('planet-label'); label.hidden = selected === body; $('planet-hover-name').textContent = body.name.toLocaleUpperCase('cs'); label.style.left = `${clamp(p.x + p.r + 20, 12, width - 165)}px`; label.style.top = `${clamp(p.y - 18, 85, height - 200)}px`; }
  function findBody(x, y) {
    const parent = selected?.parent || selected;
    const candidates = bodies.filter(body => {
      const p = body.screen;
      if (!p || (body.parentId && (p.r < .05 || !showMoons || body.parent !== parent))) return false;
      if (body !== sun && p.z < 0 && Math.hypot(p.x - sun.screen.x, p.y - sun.screen.y) < sun.screen.r) return false;
      return p.x + p.r >= 0 && p.x - p.r <= width && p.y + p.r >= 0 && p.y - p.r <= height;
    });
    const actualHit = candidates.filter(body => Math.hypot(x - body.screen.x, y - body.screen.y) <= body.screen.r).sort((a, b) => b.screen.z - a.screen.z)[0];
    if (actualHit) return actualHit;
    return candidates.filter(body => {
      const p = body.screen, rect = body.labelRect;
      return (!body.parentId || p.r >= .45) && (Math.hypot(x - p.x, y - p.y) < Math.max(p.r, 12) || (rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h));
    }).sort((a, b) => Math.hypot(x - a.screen.x, y - a.screen.y) - Math.hypot(x - b.screen.x, y - b.screen.y))[0];
  }
  function pointerMove(event) {
    pointer.x = motionPreference.matches ? 0 : (event.clientX / width - .5) * 2; pointer.y = motionPreference.matches ? 0 : (event.clientY / height - .5) * 2; pointer.active = event.pointerType !== 'touch';
    hovered = findBody(event.clientX, event.clientY); canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    $('planet-label').hidden = !hovered || !pointer.active; if (hovered && pointer.active) updateHoverLabel(hovered);
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y); if (pinchDistance) targetZoom = clamp(targetZoom * distance / pinchDistance, MIN_ZOOM, MAX_ZOOM); pinchDistance = distance; }
    }
  }
  function selectBody(body) {
    selected = body; trackedPosition = basePosition(body);
    const targetRadius = body === sun ? Math.min(width * .24, height * .23) : body.moons?.length ? Math.min(width * (width <= 760 ? .12 : .055), height * .08) : Math.min(width * .19, height * .15);
    targetZoom = clamp(targetRadius / basePosition(body).r, MIN_ZOOM, MAX_ZOOM);
    $('planet-card').hidden = false; document.querySelector('.intro').classList.add('focused'); $('planet-label').hidden = true;
    $('planet-card-title').textContent = body.name; $('planet-card-kicker').textContent = body.kind; $('planet-card-description').textContent = body.description;
    $('planet-facts').replaceChildren(...body.facts.map(([label, value]) => { const row = document.createElement('div'); row.className = 'planet-fact'; const title = document.createElement('span'); title.textContent = label; const content = document.createElement('strong'); content.textContent = value; row.append(title, content); return row; }));
    const moonPanel = $('moon-panel'); moonPanel.hidden = body === sun;
    const parent = body.parent || body;
    $('moon-panel-title').textContent = parent.moons.length ? `MĚSÍCE V MODELU · ${parent.moons.length}` : 'BEZ PŘIROZENÝCH MĚSÍCŮ';
    $('moon-buttons').replaceChildren(...parent.moons.map(moon => {
      const button = document.createElement('button'); button.className = 'moon-button'; button.dataset.moon = moon.id; button.textContent = moon.name; button.setAttribute('aria-pressed', String(moon === body)); button.addEventListener('click', () => selectBody(moon)); return button;
    }));
    $('parent-button').hidden = !body.parent; $('parent-button').textContent = body.parent ? `← ${body.parent.name} a její měsíce` : '';
    $('scale-note').textContent = trueDistances ? 'PRŮMĚRY I VZDÁLENOSTI V MĚŘÍTKU' : body === sun ? 'PRŮMĚRY V MĚŘÍTKU · DRÁHY ZKRÁCENÉ' : 'DETAIL TĚLESA · PRŮMĚRY V MĚŘÍTKU';
    document.querySelectorAll('.planet-button').forEach((button) => { const active = button.dataset.planet === parent.id; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function reset() { selected = null; trackedPosition = null; targetZoom = trueDistances ? Math.min(width * .31, height * .3) / orbitRadius(planets[7]) : 1; $('planet-card').hidden = true; document.querySelector('.intro').classList.remove('focused'); $('scale-note').textContent = trueDistances ? 'PRŮMĚRY I VZDÁLENOSTI V MĚŘÍTKU' : 'PRŮMĚRY V MĚŘÍTKU · DRÁHY ZKRÁCENÉ'; document.querySelectorAll('.planet-button').forEach((button) => { button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false'); }); }
  for (const body of [sun, ...planets]) { const button = document.createElement('button'); button.className = 'planet-button'; button.dataset.planet = body.id; button.dataset.diameterKm = body.diameterKm; button.setAttribute('aria-pressed', 'false'); const dot = document.createElement('span'); dot.className = 'planet-swatch'; dot.style.setProperty('--planet-color', body.color); dot.setAttribute('aria-hidden', 'true'); button.append(dot, document.createTextNode(body.name)); button.addEventListener('click', () => selectBody(body)); $('planet-buttons').append(button); }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; pointer.active = false; hovered = null; $('planet-label').hidden = true; });
  canvas.addEventListener('pointerdown', (event) => { canvas.setPointerCapture(event.pointerId); touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinchDistance = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointerup', (event) => {
    const start = touches.get(event.pointerId), pinching = pinchDistance > 0;
    touches.delete(event.pointerId); if (touches.size === 0) pinchDistance = 0;
    if (pinching || !start || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 20) return;
    const body = findBody(event.clientX, event.clientY); if (body) { selectBody(body); return; }
    if (paused) { notify('Čas stojí. Spusť animaci a vypusť meteory.'); return; }
    for (let i = 0; i < 8; i++) addMeteor(event.clientX + (random() - .5) * 16, event.clientY + (random() - .5) * 16, true);
    ripples.push({ x: event.clientX, y: event.clientY, age: 0 });
  });
  canvas.addEventListener('pointercancel', (event) => { touches.delete(event.pointerId); if (touches.size < 2) pinchDistance = 0; });
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); targetZoom = clamp(targetZoom * Math.exp(-event.deltaY * .0015), MIN_ZOOM, MAX_ZOOM); }, { passive: false });
  $('explore-button').addEventListener('click', () => selectBody(bodyById.get('earth')));
  $('parent-button').addEventListener('click', () => { if (selected?.parent) selectBody(selected.parent); });
  $('moon-toggle').addEventListener('click', () => { showMoons = !showMoons; $('moon-toggle').setAttribute('aria-pressed', String(showMoons)); $('moon-toggle').textContent = showMoons ? 'Měsíce viditelné' : 'Měsíce skryté'; hovered = null; $('planet-label').hidden = true; if (!showMoons && selected?.parent) selectBody(selected.parent); });
  $('distance-toggle').addEventListener('click', () => { trueDistances = !trueDistances; $('distance-toggle').setAttribute('aria-pressed', String(trueDistances)); $('distance-toggle').textContent = trueDistances ? 'Skutečné vzdálenosti' : 'Přehledné vzdálenosti'; cameraX = cameraY = 0; zoom = trueDistances ? Math.min(width * .31, height * .3) / orbitRadius(planets[7]) : 1; reset(); notify(trueDistances ? 'Ve skutečném měřítku jsou planety drobné. Vyber je v seznamu.' : 'Dráhy jsou zkrácené. Poměry velikostí zůstávají skutečné.'); });
  for (const id of ['home-button', 'close-card', 'return-button', 'reset-button']) $(id).addEventListener('click', reset);
  function syncSpeed() {
    const speed = speedOptions[speedIndex];
    const label = `${speed.value} ${speed.unit}`;
    $('speed-button-value').textContent = label;
    $('speed-button').setAttribute('aria-label', `Změnit rychlost simulace: ${speed.description}${paused ? ', pozastaveno' : ''}`);
    $('speed-output').textContent = label;
    $('speed-description').textContent = speed.description;
    $('speed-range').value = speedIndex;
    $('speed-range').setAttribute('aria-valuetext', speed.description);
    $('speed-range').style.setProperty('--speed-progress', `${speedIndex / (speedOptions.length - 1) * 100}%`);
    $('speed-status').textContent = paused ? 'Čas stojí. Zvolené tempo se použije po spuštění.' : 'Tempo mění oběhy všech planet a měsíců společně.';
    $('speed-label').innerHTML = `${paused ? '0' : speed.value}<span>${speed.unit}</span>`;
    document.querySelectorAll('[data-speed-index]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.speedIndex) === speedIndex)));
  }
  function setSpeed(index) {
    if (!Number.isInteger(index) || index < 0 || index >= speedOptions.length) return;
    speedIndex = index;
    syncSpeed();
  }
  $('speed-range').addEventListener('input', event => setSpeed(Number(event.target.value)));
  document.querySelectorAll('[data-speed-index]').forEach(button => button.addEventListener('click', () => setSpeed(Number(button.dataset.speedIndex))));
  $('speed-panel').addEventListener('toggle', event => $('speed-button').setAttribute('aria-expanded', String(event.newState === 'open')));
  function syncPause() { $('pause-button').setAttribute('aria-pressed', String(paused)); $('pause-button').setAttribute('aria-label', paused ? 'Spustit animaci' : 'Pozastavit animaci'); $('pause-button').querySelector('span').textContent = paused ? 'Spustit' : 'Pozastavit'; $('pause-button').querySelector('svg').innerHTML = paused ? '<path d="m6 4 9 6-9 6V4Z"/>' : '<path d="M7 5v10M13 5v10"/>'; syncSpeed(); }
  $('pause-button').addEventListener('click', () => { paused = !paused; syncPause(); });
  function applyMotionPreference(value) { reducedMotion = value; paused = value; pointer.x = pointer.y = 0; syncPause(); }
  motionPreference.addEventListener('change', () => applyMotionPreference(motionPreference.matches));
  $('orbit-button').addEventListener('click', () => { showOrbits = !showOrbits; $('orbit-button').setAttribute('aria-pressed', String(showOrbits)); $('orbit-button').style.color = showOrbits ? '' : '#5e6b61'; });
  $('guide-button').addEventListener('click', () => $('guide-dialog').showModal());
  for (const id of ['close-guide', 'guide-start']) $(id).addEventListener('click', () => $('guide-dialog').close());
  $('guide-dialog').addEventListener('click', (event) => { if (event.target === $('guide-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || $('guide-dialog').open) return;
    if ($('speed-panel').matches(':popover-open')) { event.preventDefault(); $('speed-panel').hidePopover(); return; }
    reset();
  });
  async function toggleSound() {
    try {
      if (!sound) {
        const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) { notify('Tento prohlížeč nepodporuje zvukovou atmosféru.'); return; }
        const audio = new Audio(); const gain = audio.createGain(); gain.gain.value = 0; gain.connect(audio.destination);
        const lowpass = audio.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 360; lowpass.connect(gain);
        for (const frequency of [55, 82.41, 110, 164.81]) { const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; oscillator.detune.value = frequency === 110 ? 7 : -3; const volume = audio.createGain(); volume.gain.value = .12; oscillator.connect(volume); volume.connect(lowpass); oscillator.start(); }
        sound = { audio, gain, enabled: false };
      }
      await sound.audio.resume(); sound.enabled = !sound.enabled;
      sound.gain.gain.cancelScheduledValues(sound.audio.currentTime); sound.gain.gain.setTargetAtTime(sound.enabled ? .22 : 0, sound.audio.currentTime, .4);
      $('sound-button').setAttribute('aria-pressed', String(sound.enabled)); $('sound-button').querySelector('span').textContent = sound.enabled ? 'Zvuk zapnutý' : 'Zvuk vypnutý';
      $('sound-button').setAttribute('aria-label', sound.enabled ? 'Vypnout zvuk' : 'Zapnout zvuk');
    } catch { notify('Zvuk nelze spustit. Zkus to znovu.'); }
  }
  $('sound-button').addEventListener('click', toggleSound);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameId); if (sound) sound.audio.suspend().catch(() => {}); } else { lastFrame = 0; frameId = requestAnimationFrame(render); if (sound?.enabled) sound.audio.resume().catch(() => {}); } });
  function updateClock() { $('utc-clock').textContent = `${new Date().toISOString().slice(11, 19)} UTC`; }
  updateClock(); setInterval(updateClock, 1000); syncPause();
  window.addEventListener('resize', resize); resize(); frameId = requestAnimationFrame(render);
})();
