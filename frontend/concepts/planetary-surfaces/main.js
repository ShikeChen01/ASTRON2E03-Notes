import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const canvas = document.getElementById('surfaces');
const ctx = canvas.getContext('2d');

const impactRateInput = document.getElementById('impact-rate');
const impactRateVal = document.getElementById('impact-rate-val');

const btnVolcanism = document.getElementById('btn-volcanism');
const btnTectonics = document.getElementById('btn-tectonics');
const btnErosion = document.getElementById('btn-erosion');
const btnReset = document.getElementById('btn-reset');

const presetBtns = {
  moon: document.getElementById('preset-moon'),
  earth: document.getElementById('preset-earth'),
  venus: document.getElementById('preset-venus'),
  io: document.getElementById('preset-io'),
};

// ---------------------------------------------------------------------------
// Canvas geometry
// ---------------------------------------------------------------------------
const W = canvas.width;   // 900
const H = canvas.height;  // 500

// Left surface panel (square patch of crust)
const SURF_X = 0;
const SURF_Y = 0;
const SURF_W = 480;
const SURF_H = H;         // 500

// Right stats panel
const STATS_X = SURF_W + 8;
const STATS_W = W - SURF_W - 8;

// Physical scale: SURF patch = 100 km × 100 km
const KM_PER_PX_X = 100 / SURF_W;
const KM_PER_PX_Y = 100 / SURF_H;
const AREA_KM2 = 100 * 100; // 10 000 km²  (we report density per 100 km²)

// Crater size parameters (in pixels)
const D_MIN_PX = 4;   // minimum crater diameter
const D_MAX_PX = 60;  // cap so they don't dwarf the panel

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
/** @type {{ x: number, y: number, r: number, alpha: number }[]} */
let craters = [];

let impactRate = 1.0;       // craters per second (user-controlled)
let volcanismOn = false;
let tectonicsOn = false;
let erosionOn = false;

let tectonicOffset = 0;     // accumulates a slow horizontal shift for visual effect

let lastT = performance.now();
let fractionalCraters = 0;  // accumulates sub-integer crater increments

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Power-law crater diameter: N(>D) ∝ D^{-2} → D = D_min / U  where U ~ Uniform(0,1). */
function randomCraterDiameter() {
  const u = Math.random();
  // Avoid u ≈ 0 blowing up; clamp so D ≤ D_MAX_PX
  const raw = D_MIN_PX / Math.max(u, D_MIN_PX / D_MAX_PX);
  return Math.min(raw, D_MAX_PX);
}

/** Add a new crater at a random position. */
function spawnCrater() {
  craters.push({
    x: SURF_X + Math.random() * SURF_W,
    y: SURF_Y + Math.random() * SURF_H,
    r: randomCraterDiameter() / 2,
    alpha: 1.0,
  });
}

/** Clear all craters and reset tectonics offset. */
function resetSurface() {
  craters = [];
  fractionalCraters = 0;
  tectonicOffset = 0;
}

// ---------------------------------------------------------------------------
// Toggle helpers
// ---------------------------------------------------------------------------
function setToggle(btn, value) {
  btn.dataset.active = value ? 'true' : 'false';
  btn.textContent = value ? 'ON' : 'OFF';
}

function applyPreset(name) {
  // Deactivate all preset highlights
  for (const b of Object.values(presetBtns)) b.classList.remove('active');
  presetBtns[name].classList.add('active');

  resetSurface();

  switch (name) {
    case 'moon':
      impactRate = 3.5;
      volcanismOn = false;
      tectonicsOn = false;
      erosionOn = false;
      break;
    case 'earth':
      impactRate = 0.8;
      volcanismOn = true;
      tectonicsOn = true;
      erosionOn = true;
      break;
    case 'venus':
      impactRate = 1.0;
      volcanismOn = true;
      tectonicsOn = false;
      erosionOn = false;
      break;
    case 'io':
      impactRate = 2.0;
      volcanismOn = true;
      tectonicsOn = false;
      erosionOn = false;
      // For Io, volcanism rate is bumped up internally in the sim
      break;
  }

  // Sync UI
  impactRateInput.value = impactRate;
  impactRateVal.textContent = impactRate.toFixed(1);
  setToggle(btnVolcanism, volcanismOn);
  setToggle(btnTectonics, tectonicsOn);
  setToggle(btnErosion, erosionOn);
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
impactRateInput.addEventListener('input', () => {
  impactRate = parseFloat(impactRateInput.value);
  impactRateVal.textContent = impactRate.toFixed(1);
});

btnVolcanism.addEventListener('click', () => {
  volcanismOn = !volcanismOn;
  setToggle(btnVolcanism, volcanismOn);
});

btnTectonics.addEventListener('click', () => {
  tectonicsOn = !tectonicsOn;
  setToggle(btnTectonics, tectonicsOn);
});

btnErosion.addEventListener('click', () => {
  erosionOn = !erosionOn;
  setToggle(btnErosion, erosionOn);
});

btnReset.addEventListener('click', () => {
  resetSurface();
  for (const b of Object.values(presetBtns)) b.classList.remove('active');
});

for (const [name, btn] of Object.entries(presetBtns)) {
  btn.addEventListener('click', () => applyPreset(name));
}

// ---------------------------------------------------------------------------
// Simulation update
// ---------------------------------------------------------------------------
function update(dt) {
  // --- Spawn new craters ---
  fractionalCraters += impactRate * dt;
  const toSpawn = Math.floor(fractionalCraters);
  fractionalCraters -= toSpawn;
  for (let i = 0; i < toSpawn; i++) spawnCrater();

  // --- Volcanism: erase craters (remove from list) ---
  // Normal volcanism removes ~5%/sec of craters.
  // For Io preset: detect by checking if Io preset button is active AND volcanism on.
  const isIo = presetBtns.io.classList.contains('active');
  if (volcanismOn && craters.length > 0) {
    const volcanismRate = isIo ? 0.98 : 0.05;  // fraction removed per second
    // Probability each crater is erased this frame
    const pErase = 1 - Math.pow(1 - volcanismRate, dt);
    craters = craters.filter(() => Math.random() > pErase);
  }

  // --- Erosion: fade alpha of craters ---
  if (erosionOn) {
    const fadeRate = 0.12; // alpha units per second
    for (const c of craters) {
      c.alpha -= fadeRate * dt;
    }
    // Remove fully faded craters
    craters = craters.filter(c => c.alpha > 0.02);
  }

  // --- Tectonics: accumulate a slow horizontal shift ---
  if (tectonicsOn) {
    tectonicOffset += 4 * dt; // pixels per second drift
  }
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Draw the surface patch (left panel). */
function drawSurface() {
  // Background — dark grey "crust"
  ctx.fillStyle = '#1a1e26';
  ctx.fillRect(SURF_X, SURF_Y, SURF_W, SURF_H);

  // Subtle tectonic texture: thin faint fracture lines if tectonics on
  if (tectonicsOn) {
    const shift = tectonicOffset % SURF_W;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#bb9af7';
    ctx.lineWidth = 1;
    // Diagonal fractures drifting slowly
    for (let i = -1; i < 8; i++) {
      const x0 = (i * 70 + shift) % SURF_W;
      ctx.beginPath();
      ctx.moveTo(SURF_X + x0, SURF_Y);
      ctx.lineTo(SURF_X + x0 - 60, SURF_Y + SURF_H);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Apply clip so craters don't overflow into stats panel
  ctx.save();
  ctx.beginPath();
  ctx.rect(SURF_X, SURF_Y, SURF_W, SURF_H);
  ctx.clip();

  // Draw craters (from oldest/largest to newest so small craters appear on top)
  for (const c of craters) {
    const { x, y, r, alpha } = c;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Ejecta blanket: faint lighter halo
    const ejGrad = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.2);
    ejGrad.addColorStop(0, 'rgba(160,150,130,0.18)');
    ejGrad.addColorStop(1, 'rgba(160,150,130,0)');
    ctx.fillStyle = ejGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, 2 * Math.PI);
    ctx.fill();

    // Crater floor (dark interior)
    ctx.fillStyle = '#111418';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();

    // Crater rim — light grey ring
    ctx.strokeStyle = '#8a8070';
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();

    // Bright inner highlight (north rim)
    ctx.strokeStyle = 'rgba(220,210,190,0.5)';
    ctx.lineWidth = Math.max(0.5, r * 0.10);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.88, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore(); // end clip

  // Panel border
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.strokeRect(SURF_X + 0.5, SURF_Y + 0.5, SURF_W - 1, SURF_H - 1);
}

/** Draw the stats panel (right side). */
function drawStats() {
  const x = STATS_X;
  const panelW = STATS_W;

  // Background
  ctx.fillStyle = '#161b22';
  ctx.fillRect(x, 0, panelW, H);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, 0.5, panelW - 1, H - 1);

  const pad = 18;
  const tx = x + pad;
  let ty = 28;
  const lineH = 22;
  const sectionGap = 14;

  // Title
  ctx.fillStyle = '#7aa2f7';
  ctx.font = 'bold 14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Surface Statistics', tx, ty);
  ty += lineH + sectionGap;

  // Crater count
  const count = craters.length;
  ctx.fillStyle = '#e6edf3';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Crater count:', tx, ty);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(count, x + panelW - pad, ty);
  ty += lineH;

  // Crater density per 100 km²
  const density100 = (count / AREA_KM2) * 100 * 100; // per 10000 km² → scale to per 100 km²
  // Actually: area is 10000 km², so density = count / 10000 * 100 = count / 100
  const densityPer100 = (count / 100).toFixed(1);
  ctx.fillStyle = '#e6edf3';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Density (per 100 km\u00B2):', tx, ty);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(densityPer100, x + panelW - pad, ty);
  ty += lineH;

  // Effective surface age estimate
  // Reference: impactRate = 1 cps means ~1 crater per second of sim time.
  // We scale by "reference rate" of 1 crater per second over 10000 km²
  // Age (Myr) ≈ density per km² / (reference flux density)
  // Simple model: 1 crater/sec at impactRate=1 → accumulate proportionally.
  // For display we use: age ~ count / (impactRate_ref * 1) * some_scale
  // Let's define: at impactRate=1, 100 craters = "1 Gyr" equivalent.
  const refRate = 1.0;
  const ageGyr = (count / 100) * (refRate / Math.max(impactRate, 0.01));
  let ageStr;
  if (ageGyr < 0.001) {
    ageStr = '< 1 Myr';
  } else if (ageGyr < 1) {
    ageStr = (ageGyr * 1000).toFixed(0) + ' Myr';
  } else {
    ageStr = ageGyr.toFixed(2) + ' Gyr';
  }
  ctx.fillStyle = '#e6edf3';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Est. surface age:', tx, ty);
  ctx.fillStyle = '#9ece6a';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(ageStr, x + panelW - pad, ty);
  ty += lineH + sectionGap;

  // Divider
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(x + panelW - pad, ty);
  ctx.stroke();
  ty += sectionGap;

  // Active processes
  ctx.fillStyle = '#7aa2f7';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Active processes', tx, ty);
  ty += lineH;

  const processes = [
    { name: 'Impacts', on: impactRate > 0 },
    { name: 'Volcanism', on: volcanismOn },
    { name: 'Tectonics', on: tectonicsOn },
    { name: 'Erosion', on: erosionOn },
  ];

  for (const p of processes) {
    ctx.fillStyle = '#8b949e';
    ctx.font = '13px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(p.name, tx + 14, ty);
    ctx.fillStyle = p.on ? '#9ece6a' : '#f7768e';
    ctx.font = 'bold 12px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.on ? 'ON' : 'OFF', x + panelW - pad, ty);
    ty += lineH;
  }

  ty += sectionGap;
  // Divider
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(x + panelW - pad, ty);
  ctx.stroke();
  ty += sectionGap;

  // Body descriptor
  const descriptor = getBodyDescriptor();
  ctx.fillStyle = '#7aa2f7';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Body resembles', tx, ty);
  ty += lineH;

  // Word-wrap descriptor into ~panelW-2*pad pixels
  const maxLineW = panelW - 2 * pad;
  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';

  const words = descriptor.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxLineW && line) {
      ctx.fillText(line, tx, ty);
      ty += 17;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, tx, ty);
    ty += 17;
  }

  // Impact rate readout at bottom
  ty = H - 40;
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Impact rate: ${impactRate.toFixed(1)} cr/s`, tx, ty);
  ty += 16;
  ctx.fillText(`Impact rate (b=2 power law)`, tx, ty);
}

function getBodyDescriptor() {
  const isIo = presetBtns.io.classList.contains('active');
  if (isIo && volcanismOn) return 'Io — extreme volcanism, zero craters, constantly resurfaced.';
  if (volcanismOn && tectonicsOn && erosionOn) return 'Earth — active resurfacing keeps craters rare.';
  if (volcanismOn && !tectonicsOn && !erosionOn) return 'Venus — resurfaced ~700 Myr ago by global volcanism.';
  if (!volcanismOn && !tectonicsOn && !erosionOn && impactRate > 2) return 'Moon / Mercury — heavily cratered, ancient surface.';
  if (!volcanismOn && !tectonicsOn && erosionOn) return 'Mars — cratered but with wind/water erosion features.';
  if (craters.length < 5) return 'Young or resurfaced terrain — few craters.';
  if (craters.length > 200) return 'Ancient heavily cratered surface.';
  return 'Mixed geology — multiple processes at work.';
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;

  update(dt);

  ctx.clearRect(0, 0, W, H);
  drawSurface();
  drawStats();

  requestAnimationFrame(frame);
}

// Sync initial UI labels
impactRateVal.textContent = impactRate.toFixed(1);
setToggle(btnVolcanism, volcanismOn);
setToggle(btnTectonics, tectonicsOn);
setToggle(btnErosion, erosionOn);

requestAnimationFrame(frame);
