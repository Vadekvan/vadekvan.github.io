(() => {
  'use strict';
  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionPreference.matches;
  let showOrbits = true;
  let width = 0, height = 0, dpr = 1, time = 0, lastFrame = 0;
  let zoom = 1, targetZoom = 1, focusX = 0, focusY = 0, selected = null, hovered = null;
  let background, frameId, toastTimeout, sound = null;
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0, active: false };
  const meteors = [], ripples = [], touches = new Map();
  let pinchDistance = 0;

  const bodies = [
    { id: 'sun', name: 'Slunce', kind: 'HVĚZDA · SRDCE NAŠÍ SOUSTAVY', color: '#eeb783', x: .465, y: .485, r: .043, depth: .35, description: 'Hvězda, kolem které se to všechno točí. Její světlo putuje k Zemi přibližně osm minut. Každý sluneční paprsek je tak malý pohled do minulosti.', facts: [['Průměr', '1 392 700 km'], ['Teplota povrchu', '≈ 5 500 °C'], ['Stáří', '≈ 4,6 miliardy let']] },
    { id: 'earth', name: 'Země', kind: 'KAMENNÁ PLANETA · NÁŠ DOMOV', color: '#86b9b1', x: .69, y: .47, r: .143, depth: 1, description: 'Náš malý modrý domov v nekonečnu. Oceány pokrývají přibližně 71 % povrchu a tenká atmosféra chrání všechno, co máme rádi.', facts: [['Průměr', '12 742 km'], ['Oběh kolem Slunce', '365,25 dne'], ['Přirozené měsíce', '1']] },
    { id: 'moon', name: 'Měsíc', kind: 'PŘIROZENÝ SATELIT · TICHÝ SOUSED', color: '#babcb0', x: .795, y: .285, r: .021, depth: .7, description: 'Náš nejbližší vesmírný soused. K Zemi obrací stále stejnou tvář a jeho gravitace pomáhá vytvářet příliv a odliv našich oceánů.', facts: [['Průměr', '3 475 km'], ['Vzdálenost od Země', '≈ 384 400 km'], ['Oběh kolem Země', '27,3 dne']] },
    { id: 'mars', name: 'Mars', kind: 'KAMENNÁ PLANETA · RUDÝ SVĚT', color: '#c88963', x: .59, y: .245, r: .026, depth: .5, description: 'Rezavé pouště, obrovské kaňony a stopy dávné vody. Na Marsu stojí Olympus Mons, největší známá sopka ve Sluneční soustavě.', facts: [['Průměr', '6 779 km'], ['Oběh kolem Slunce', '687 dní'], ['Přirozené měsíce', '2']] },
    { id: 'jupiter', name: 'Jupiter', kind: 'PLYNNÝ OBR · KRÁL PLANET', color: '#c4aa88', x: .49, y: .71, r: .055, depth: .65, description: 'Největší planeta naší soustavy. Pod jejími pásy mračen zuří bouře; slavná Velká rudá skvrna se pozoruje už po staletí.', facts: [['Průměr', '139 820 km'], ['Oběh kolem Slunce', '11,86 roku'], ['Délka dne', '≈ 10 hodin']] },
    { id: 'saturn', name: 'Saturn', kind: 'PLYNNÝ OBR · SVĚT PRSTENCŮ', color: '#c6ba91', x: .852, y: .735, r: .047, depth: .8, description: 'Planeta, která nepotřebuje představovat. Její prstence tvoří nespočet částic ledu a kamene, od drobného prachu až po velké balvany.', facts: [['Průměr', '116 460 km'], ['Oběh kolem Slunce', '29,45 roku'], ['Délka dne', '≈ 10,7 hodiny']] },
  ];
  let seed = 14728;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const stars = Array.from({ length: 1200 }, () => ({ x: random(), y: random(), radius: .3 + random() * 1.25, brightness: .2 + random() * .65, phase: random() * Math.PI * 2, depth: .1 + random() * .9, warm: random() > .8 }));
  const asteroids = Array.from({ length: 65 }, () => ({ angle: random() * Math.PI * 2, orbit: .25 + random() * .08, size: .6 + random() ** 3 * 4, speed: .06 + random() * .06, shape: Array.from({ length: 7 }, () => .6 + random() * .4) }));
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
    const size = body.id === 'earth' ? 420 : 240;
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
      else color = [99 + n * 110, 104 + n * 106, 97 + n * 99];
      const light = Math.max(0, -x * .76 - y * .28 + z * .48);
      const shade = .055 + light * .94;
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
    const mobile = width <= 760;
    const positions = { sun: [.32, .64], earth: [.69, .555], moon: [.86, .405], mars: [.8, .265], jupiter: [.27, .70], saturn: [.84, .755] };
    const [x, y] = mobile ? positions[body.id] : [body.x, body.y];
    const scale = mobile ? Math.min(width * 1.26, height * .76) : Math.min(height, width * .68);
    return { x: x * width, y: y * height, r: body.r * scale };
  }
  function position(body) {
    const base = basePosition(body);
    return { x: (base.x - width * .64) * zoom + width * .64 + focusX + pointer.smoothX * 25 * body.depth + Math.sin(time * .13 + body.x * 8) * 3,
      y: (base.y - height * .5) * zoom + height * .5 + focusY + pointer.smoothY * 19 * body.depth + Math.cos(time * .11 + body.y * 5) * 4,
      r: base.r * zoom };
  }
  function ring(p, front) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-.38); ctx.scale(1, .34);
    for (let i = 0; i < 24; i++) { const radius = p.r * (1.37 + i * .038); ctx.beginPath(); ctx.arc(0, 0, radius, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.strokeStyle = `rgba(192,182,142,${(i === 13 || i === 14) ? .045 : .17 + Math.sin(i * 1.7) * .09})`; ctx.lineWidth = p.r * .028; ctx.stroke(); }
    ctx.restore();
  }
  function drawBody(body) {
    const p = position(body); body.screen = p;
    if (body.id === 'sun') {
      const glow = ctx.createRadialGradient(p.x, p.y, p.r * .3, p.x, p.y, p.r * 6);
      glow.addColorStop(0, '#d69a5655'); glow.addColorStop(.22, '#c285432b'); glow.addColorStop(.6, '#b8863910'); glow.addColorStop(1, '#ad793900'); ctx.fillStyle = glow; ctx.fillRect(p.x - p.r * 6, p.y - p.r * 6, p.r * 12, p.r * 12);
      const surface = ctx.createRadialGradient(p.x - p.r * .3, p.y - p.r * .3, 0, p.x, p.y, p.r); surface.addColorStop(0, '#fff2c4'); surface.addColorStop(.65, '#f4cf91'); surface.addColorStop(.9, '#d99550'); surface.addColorStop(1, '#a9652d'); ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.clip();
      for (let i = 0; i < 110; i++) { const angle = i * 2.39996, radius = Math.sqrt(i / 110) * p.r; ctx.fillStyle = `rgba(149,80,26,${.06 + Math.sin(i + time * .3) * .025})`; ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius, p.r * .055, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    } else {
      if (body.id === 'saturn') ring(p, false);
      if (body.id === 'earth') { const glow = ctx.createRadialGradient(p.x, p.y, p.r * .94, p.x, p.y, p.r * 1.12); glow.addColorStop(0, '#8abeb625'); glow.addColorStop(.5, '#68a5a010'); glow.addColorStop(1, '#689f9900'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.12, 0, Math.PI * 2); ctx.fill(); }
      ctx.drawImage(body.texture, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      if (body.id === 'saturn') ring(p, true);
    }
    if (hovered === body || selected === body) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2); ctx.strokeStyle = '#e6b48b60'; ctx.lineWidth = .7; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
      for (let a = 0; a < 4; a++) { const angle = a * Math.PI / 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(angle) * (p.r + 8), p.y + Math.sin(angle) * (p.r + 8)); ctx.lineTo(p.x + Math.cos(angle) * (p.r + 15), p.y + Math.sin(angle) * (p.r + 15)); ctx.strokeStyle = '#e6b48bb0'; ctx.stroke(); }
    }
  }
  function drawOrbits() {
    if (!showOrbits) return;
    const center = position(bodies[0]);
    ctx.save(); ctx.translate(center.x, center.y); ctx.rotate(-.32);
    const scale = Math.min(width, height * 1.6) * zoom;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, 0, scale * (.12 + i * .093), scale * (.12 + i * .093) * .49, 0, 0, Math.PI * 2); ctx.strokeStyle = i === 2 ? '#adb9a923' : '#acbda416'; ctx.lineWidth = .65; ctx.stroke(); }
    ctx.restore();
    const earth = position(bodies[1]); ctx.save(); ctx.translate(earth.x, earth.y); ctx.rotate(-.55); ctx.beginPath(); ctx.ellipse(0, 0, earth.r * 1.8, earth.r * .83, 0, 0, Math.PI * 2); ctx.setLineDash([2, 5]); ctx.strokeStyle = '#b8c5b919'; ctx.lineWidth = .6; ctx.stroke(); ctx.restore();
  }
  function addMeteor(x, y, burst = false) {
    const angle = burst ? -Math.PI * .5 + (random() - .5) * 2.9 : Math.PI * .76;
    const speed = burst ? 230 + random() * 260 : 160 + random() * 180;
    meteors.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 1.1 + random() * 1.5, length: burst ? 35 + random() * 75 : 85 + random() * 95, size: random() * 1.3 + .5 });
    if (meteors.length > 90) meteors.shift();
  }
  function drawAsteroids() {
    const center = position(bodies[0]), scale = Math.min(width, height * 1.6) * zoom;
    ctx.save(); ctx.translate(center.x, center.y); ctx.rotate(-.32);
    for (const rock of asteroids) {
      const angle = rock.angle + time * rock.speed, x = Math.cos(angle) * rock.orbit * scale, y = Math.sin(angle) * rock.orbit * scale * .49;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rock.angle + time * .16); ctx.beginPath();
      for (let i = 0; i < rock.shape.length; i++) { const a = i / rock.shape.length * Math.PI * 2, radius = rock.size * zoom * rock.shape[i]; const px = Math.cos(a) * radius, py = Math.sin(a) * radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fillStyle = '#7c817074'; ctx.strokeStyle = '#c1b79a59'; ctx.lineWidth = .4; ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
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
  function render(timestamp) {
    const realDt = Math.min((timestamp - (lastFrame || timestamp)) / 1000, .05); lastFrame = timestamp;
    const dt = paused ? 0 : realDt; time += dt;
    const ease = 1 - Math.exp(-realDt * 4);
    pointer.smoothX = mix(pointer.smoothX, pointer.x, ease); pointer.smoothY = mix(pointer.smoothY, pointer.y, ease);
    zoom = mix(zoom, targetZoom, ease);
    let targetX = 0, targetY = 0;
    if (selected) { const p = basePosition(selected); targetX = -(p.x - width * .64) * zoom + (width <= 760 ? width * .08 : width * .045); targetY = -(p.y - height * .5) * zoom + (width <= 760 ? height * .13 : 0); }
    focusX = mix(focusX, targetX, ease); focusY = mix(focusY, targetY, ease);
    ctx.drawImage(background, 0, 0, width, height);
    for (const star of stars) {
      let x = star.x * width + pointer.smoothX * star.depth * 14, y = star.y * height + pointer.smoothY * star.depth * 11;
      const alpha = star.brightness * (.78 + Math.sin(time * .5 + star.phase) * .22);
      ctx.fillStyle = star.warm ? `rgba(218,194,153,${alpha})` : `rgba(199,214,206,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, star.radius * (width <= 760 ? .7 : 1), 0, Math.PI * 2); ctx.fill();
      if (star.radius > 1.45 && star.brightness > .7) { ctx.strokeStyle = `rgba(219,230,211,${alpha * .26})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
    }
    drawOrbits();
    drawAsteroids();
    for (const body of bodies) drawBody(body);
    nextMeteor -= dt; if (nextMeteor <= 0) { addMeteor(width * (.5 + random() * .55), height * random() * .45); nextMeteor = 2.6 + random() * 3; }
    drawMeteors(dt);
    if (hovered && pointer.active) updateHoverLabel(hovered);
    frameId = requestAnimationFrame(render);
  }

  function notify(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 2600); }
  function updateHoverLabel(body) { const p = body.screen; const label = $('planet-label'); label.hidden = selected === body; $('planet-hover-name').textContent = body.name.toLocaleUpperCase('cs'); label.style.left = `${clamp(p.x + p.r + 20, 12, width - 165)}px`; label.style.top = `${clamp(p.y - 18, 85, height - 200)}px`; }
  function findBody(x, y) { return [...bodies].reverse().find((body) => body.screen && Math.hypot(x - body.screen.x, y - body.screen.y) < body.screen.r + 8); }
  function pointerMove(event) {
    pointer.x = motionPreference.matches ? 0 : (event.clientX / width - .5) * 2; pointer.y = motionPreference.matches ? 0 : (event.clientY / height - .5) * 2; pointer.active = event.pointerType !== 'touch';
    hovered = findBody(event.clientX, event.clientY); canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    $('planet-label').hidden = !hovered || !pointer.active; if (hovered && pointer.active) updateHoverLabel(hovered);
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y); if (pinchDistance) targetZoom = clamp(targetZoom * distance / pinchDistance, .65, 2.8); pinchDistance = distance; }
    }
  }
  function selectBody(body) {
    selected = body; targetZoom = body.id === 'earth' ? 1.32 : body.id === 'sun' ? 2 : 2.5;
    $('planet-card').hidden = false; document.querySelector('.intro').classList.add('focused'); $('planet-label').hidden = true;
    $('planet-card-title').textContent = body.name; $('planet-card-kicker').textContent = body.kind; $('planet-card-description').textContent = body.description;
    $('planet-facts').replaceChildren(...body.facts.map(([label, value]) => { const row = document.createElement('div'); row.className = 'planet-fact'; const title = document.createElement('span'); title.textContent = label; const content = document.createElement('strong'); content.textContent = value; row.append(title, content); return row; }));
    document.querySelectorAll('.planet-button').forEach((button) => { const active = button.dataset.planet === body.id; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function reset() { selected = null; targetZoom = 1; $('planet-card').hidden = true; document.querySelector('.intro').classList.remove('focused'); document.querySelectorAll('.planet-button').forEach((button) => { button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false'); }); }
  for (const body of bodies) { const button = document.createElement('button'); button.className = 'planet-button'; button.dataset.planet = body.id; button.setAttribute('aria-pressed', 'false'); const dot = document.createElement('span'); dot.className = 'planet-swatch'; dot.style.setProperty('--planet-color', body.color); dot.setAttribute('aria-hidden', 'true'); button.append(dot, document.createTextNode(body.name)); button.addEventListener('click', () => selectBody(body)); $('planet-buttons').append(button); }
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
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); targetZoom = clamp(targetZoom * Math.exp(-event.deltaY * .001), .65, 2.8); }, { passive: false });
  $('explore-button').addEventListener('click', () => selectBody(bodies[1]));
  for (const id of ['home-button', 'close-card', 'return-button', 'reset-button']) $(id).addEventListener('click', reset);
  function syncPause() { $('pause-button').setAttribute('aria-pressed', String(paused)); $('pause-button').setAttribute('aria-label', paused ? 'Spustit animaci' : 'Pozastavit animaci'); $('pause-button').querySelector('span').textContent = paused ? 'Spustit' : 'Pozastavit'; $('pause-button').querySelector('svg').innerHTML = paused ? '<path d="m6 4 9 6-9 6V4Z"/>' : '<path d="M7 5v10M13 5v10"/>'; $('speed-label').innerHTML = `${paused ? '0.0' : '1.0'}<span>×</span>`; }
  $('pause-button').addEventListener('click', () => { paused = !paused; syncPause(); });
  motionPreference.addEventListener('change', (event) => { paused = event.matches; syncPause(); });
  $('orbit-button').addEventListener('click', () => { showOrbits = !showOrbits; $('orbit-button').setAttribute('aria-pressed', String(showOrbits)); $('orbit-button').style.color = showOrbits ? '' : '#5e6b61'; });
  $('guide-button').addEventListener('click', () => $('guide-dialog').showModal());
  for (const id of ['close-guide', 'guide-start']) $(id).addEventListener('click', () => $('guide-dialog').close());
  $('guide-dialog').addEventListener('click', (event) => { if (event.target === $('guide-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('guide-dialog').open) reset(); });
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
    } catch { notify('Zvuk nelze spustit. Zkus to znovu.'); }
  }
  $('sound-button').addEventListener('click', toggleSound);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameId); if (sound) sound.audio.suspend().catch(() => {}); } else { lastFrame = 0; frameId = requestAnimationFrame(render); if (sound?.enabled) sound.audio.resume().catch(() => {}); } });
  function updateClock() { $('utc-clock').textContent = `${new Date().toISOString().slice(11, 19)} UTC`; }
  updateClock(); setInterval(updateClock, 1000); syncPause();
  window.addEventListener('resize', resize); resize(); frameId = requestAnimationFrame(render);
})();
