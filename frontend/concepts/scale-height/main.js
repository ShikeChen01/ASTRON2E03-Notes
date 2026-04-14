import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ── Constants ────────────────────────────────────────────────────────────────
const R = 8.314;      // J/(mol·K)
const P0 = 101325;    // Pa  (reference surface pressure)

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas  = document.getElementById('sh-canvas');
const ctx     = canvas.getContext('2d');
const sliderT = document.getElementById('T');
const sliderG = document.getElementById('g');
const sliderMu = document.getElementById('mu');
const spanT   = document.getElementById('T-val');
const spanG   = document.getElementById('g-val');
const spanMu  = document.getElementById('mu-val');

// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  earth:   { T: 255,  g: 9.81,  mu: 29.0 },
  venus:   { T: 735,  g: 8.87,  mu: 44.0 },
  mars:    { T: 210,  g: 3.71,  mu: 43.3 },
  jupiter: { T: 165,  g: 23.0,  mu: 2.3  },
};

const GHOST_PLANETS = [
  { label: 'Earth',   H: 8.5,  color: 'rgba(154,206,106,0.35)' },
  { label: 'Venus',   H: 15.9, color: 'rgba(255,209,102,0.35)' },
  { label: 'Mars',    H: 11.1, color: 'rgba(247,118,142,0.35)' },
  { label: 'Jupiter', H: 27.0, color: 'rgba(122,162,247,0.35)' },
];

// ── Scale-height formula ──────────────────────────────────────────────────────
function calcH(T, g, mu) {
  // H = RT / (mu_m * g),  mu in kg/mol
  return (R * T) / ((mu / 1000) * g) / 1000; // km
}

// ── Layout constants ──────────────────────────────────────────────────────────
const W = canvas.width;
const H_canvas = canvas.height;
const PAD = { top: 40, bottom: 50, left: 60, right: 20 };

// Left graph occupies left 55% of canvas
const GRAPH_RIGHT = Math.floor(W * 0.58);
const GRAPH = {
  x: PAD.left,
  y: PAD.top,
  w: GRAPH_RIGHT - PAD.left,
  h: H_canvas - PAD.top - PAD.bottom,
};

// Right column panel
const COL_X = GRAPH_RIGHT + 30;
const COL_W = W - COL_X - PAD.right;
const COL = {
  x: COL_X,
  y: PAD.top,
  w: COL_W,
  h: H_canvas - PAD.top - PAD.bottom,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ALT_MAX_KM = 80;          // y-axis range
const LOG_MIN = 1e-4;           // x-axis (P/P0) min
const LOG_MAX = 1.0;            // x-axis (P/P0) max

/** Map altitude (km) → canvas y pixel within GRAPH */
function altToY(z) {
  return GRAPH.y + GRAPH.h - (z / ALT_MAX_KM) * GRAPH.h;
}

/** Map log10(P/P0) → canvas x pixel within GRAPH */
function logPtoX(lp) {
  const lMin = Math.log10(LOG_MIN);
  const lMax = Math.log10(LOG_MAX);
  return GRAPH.x + ((lp - lMin) / (lMax - lMin)) * GRAPH.w;
}

function pRatioToX(ratio) {
  return logPtoX(Math.log10(Math.max(ratio, LOG_MIN)));
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawAxes() {
  ctx.strokeStyle = '#3d4451';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px monospace';

  // Border
  ctx.strokeRect(GRAPH.x, GRAPH.y, GRAPH.w, GRAPH.h);

  // Y-axis ticks: altitude 0,10,20,...,80 km
  for (let z = 0; z <= ALT_MAX_KM; z += 10) {
    const y = altToY(z);
    ctx.beginPath();
    ctx.moveTo(GRAPH.x, y);
    ctx.lineTo(GRAPH.x + 5, y);
    ctx.stroke();
    ctx.fillText(z + ' km', GRAPH.x - 48, y + 4);
  }

  // X-axis ticks: log scale
  [1e-4, 1e-3, 0.01, 0.1, 1].forEach(v => {
    const x = pRatioToX(v);
    ctx.beginPath();
    ctx.moveTo(x, GRAPH.y + GRAPH.h);
    ctx.lineTo(x, GRAPH.y + GRAPH.h + 5);
    ctx.stroke();
    const label = v === 1 ? '1' : v === 0.1 ? '0.1' : v === 0.01 ? '10⁻²' : v === 1e-3 ? '10⁻³' : '10⁻⁴';
    ctx.fillText(label, x - 12, GRAPH.y + GRAPH.h + 18);
  });

  // Axis labels
  ctx.save();
  ctx.translate(12, GRAPH.y + GRAPH.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px sans-serif';
  ctx.fillText('Altitude (km)', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px sans-serif';
  ctx.fillText('P(z) / P₀', GRAPH.x + GRAPH.w / 2 - 25, GRAPH.y + GRAPH.h + 38);
}

/** Draw one exponential curve for given scale height H (km) */
function drawCurve(Hkm, color, lineWidth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  let first = true;
  for (let z = 0; z <= ALT_MAX_KM; z += 0.5) {
    const ratio = Math.exp(-z / Hkm);
    if (ratio < LOG_MIN) break;
    const x = pRatioToX(ratio);
    const y = altToY(z);
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** Draw dashed horizontal line at z = n*H with label */
function drawHLine(z, label, alpha) {
  const y = altToY(z);
  if (y < GRAPH.y || y > GRAPH.y + GRAPH.h) return;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = `rgba(187,154,247,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(GRAPH.x, y);
  ctx.lineTo(GRAPH.x + GRAPH.w, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(187,154,247,${alpha + 0.1})`;
  ctx.font = '10px monospace';
  ctx.fillText(label, GRAPH.x + GRAPH.w - 28, y - 3);
  ctx.restore();
}

function drawGraph(Hkm) {
  // Ghost curves
  GHOST_PLANETS.forEach(p => drawCurve(p.H, p.color, 1.5));

  // H-multiple lines
  [3, 2, 1].forEach((n, i) => {
    const alpha = 0.25 + i * 0.15;
    if (n * Hkm <= ALT_MAX_KM) drawHLine(n * Hkm, n + 'H', alpha);
  });

  // Main curve
  drawCurve(Hkm, '#7aa2f7', 2.5);

  // Ghost legend (bottom-right of graph area)
  const lx = GRAPH.x + GRAPH.w - 95;
  let ly = GRAPH.y + 12;
  ctx.font = '9px monospace';
  GHOST_PLANETS.forEach(p => {
    ctx.fillStyle = p.color.replace('0.35', '0.8');
    ctx.fillRect(lx, ly - 7, 14, 2);
    ctx.fillStyle = '#8b949e';
    ctx.fillText(p.label, lx + 18, ly);
    ly += 14;
  });
}

function drawColumn(Hkm) {
  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(COL.x, COL.y, COL.w, COL.h);

  // Scale: how many km does the column represent?
  const totalKm = Math.max(5 * Hkm, 30);
  const pxPerKm = COL.h / totalKm;

  // Column gradient: dense blue at bottom, transparent at top
  const colW = Math.floor(COL.w * 0.45);
  const colX = COL.x + (COL.w - colW) / 2;

  // Draw column slice by slice (bottom to top)
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const z = (i / steps) * totalKm; // km
    const density = Math.exp(-z / Hkm);
    const y = COL.y + COL.h - (z / totalKm) * COL.h;
    const alpha = density * 0.85;
    ctx.fillStyle = `rgba(122,162,247,${alpha.toFixed(3)})`;
    ctx.fillRect(colX, y, colW, COL.h / steps + 1);
  }

  // Outline
  ctx.strokeStyle = '#3d4451';
  ctx.lineWidth = 1;
  ctx.strokeRect(colX, COL.y, colW, COL.h);

  // H tick mark
  const tickY = COL.y + COL.h - (Hkm / totalKm) * COL.h;
  ctx.save();
  ctx.strokeStyle = 'rgba(187,154,247,0.7)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(colX - 5, tickY);
  ctx.lineTo(colX + colW + 5, tickY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(187,154,247,0.9)';
  ctx.font = '10px monospace';
  ctx.fillText('1H', colX + colW + 8, tickY + 4);
  ctx.restore();

  // Column label
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px sans-serif';
  ctx.fillText('Atm. column', COL.x + COL.w / 2 - 35, COL.y + COL.h + 18);
}

function drawReadouts(T, g, mu, Hkm) {
  const x0 = COL.x;
  const y0 = COL.y - 28;

  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#7aa2f7';
  ctx.fillText(`H = ${Hkm.toFixed(2)} km`, x0, y0);

  const ratio10 = Math.exp(-10 / Hkm);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(`P(10 km)/P₀ = exp(−10/${Hkm.toFixed(1)}) = ${ratio10.toFixed(4)}`, x0, y0 + 18);

  const colMass = P0 / g;
  ctx.fillStyle = '#9ece6a';
  ctx.fillText(`Col. mass = P₀/g = ${colMass.toFixed(0)} kg/m²`, x0, y0 + 34);
}

function draw() {
  const T  = parseFloat(sliderT.value);
  const g  = parseFloat(sliderG.value);
  const mu = parseFloat(sliderMu.value);
  const Hkm = calcH(T, g, mu);

  ctx.clearRect(0, 0, W, H_canvas);

  // Panel background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H_canvas);

  drawAxes();
  drawGraph(Hkm);
  drawColumn(Hkm);
  drawReadouts(T, g, mu, Hkm);
}

// ── Event wiring ─────────────────────────────────────────────────────────────
function setPreset(name) {
  const p = PRESETS[name];
  sliderT.value  = p.T;
  sliderG.value  = p.g;
  sliderMu.value = p.mu;
  spanT.textContent  = p.T;
  spanG.textContent  = p.g.toFixed(2);
  spanMu.textContent = p.mu.toFixed(1);
  draw();
}

sliderT.addEventListener('input', () => { spanT.textContent = sliderT.value; draw(); });
sliderG.addEventListener('input', () => { spanG.textContent = parseFloat(sliderG.value).toFixed(2); draw(); });
sliderMu.addEventListener('input', () => { spanMu.textContent = parseFloat(sliderMu.value).toFixed(1); draw(); });

document.getElementById('btn-earth').addEventListener('click',   () => setPreset('earth'));
document.getElementById('btn-venus').addEventListener('click',   () => setPreset('venus'));
document.getElementById('btn-mars').addEventListener('click',    () => setPreset('mars'));
document.getElementById('btn-jupiter').addEventListener('click', () => setPreset('jupiter'));

// ── Initial render ────────────────────────────────────────────────────────────
draw();
