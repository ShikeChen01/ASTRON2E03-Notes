import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ─── Physical constants ───────────────────────────────────────────────────────
const T_SUN   = 5778;        // K
const R_SUN   = 6.957e8;     // m
const AU      = 1.496e11;    // m

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('teq-canvas');
const ctx    = canvas.getContext('2d');

const slL  = document.getElementById('sl-L');   // log10 L/Lsun
const slA  = document.getElementById('sl-a');
const slAB = document.getElementById('sl-AB');
const slTs = document.getElementById('sl-Ts');

const lblL  = document.getElementById('lbl-L');
const lblA  = document.getElementById('lbl-a');
const lblAB = document.getElementById('lbl-AB');
const lblTs = document.getElementById('lbl-Ts');

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  mercury: { L: 1,    a: 0.39, AB: 0.12, Ts: 5778 },
  venus:   { L: 1,    a: 0.72, AB: 0.75, Ts: 5778 },
  earth:   { L: 1,    a: 1.00, AB: 0.30, Ts: 5778 },
  mars:    { L: 1,    a: 1.52, AB: 0.25, Ts: 5778 },
  jupiter: { L: 1,    a: 5.20, AB: 0.34, Ts: 5778 },
};

const PRESET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'];
const PRESET_KEYS  = ['mercury', 'venus', 'earth', 'mars', 'jupiter'];

// ─── Physics ──────────────────────────────────────────────────────────────────
function calcTeq(L_lsun, a_au, AB, Ts) {
  // R_star from Stefan-Boltzmann: L = 4πR²σT⁴  →  R ∝ sqrt(L)·T^{-2}
  const R_star = R_SUN * Math.sqrt(L_lsun) * (T_SUN / Ts) ** 2;
  const a_m    = a_au * AU;
  return Ts * Math.sqrt(R_star / (2 * a_m)) * (1 - AB) ** 0.25;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
function teqColor(T) {
  // 100 K → blue, 273 K → white, 400 K → orange, 500+ K → red
  const stops = [
    [100,  [30,  80,  220]],
    [200,  [100, 150, 255]],
    [273,  [220, 220, 255]],
    [320,  [255, 220, 150]],
    [400,  [255, 140,  40]],
    [500,  [220,  30,  30]],
  ];
  T = Math.max(100, Math.min(600, T));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (T <= t1) {
      const f = (T - t0) / (t1 - t0);
      const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(220,30,30)';
}

// ─── State ────────────────────────────────────────────────────────────────────
let state = { L: 1, a: 1, AB: 0.30, Ts: 5778 };

function getState() {
  return {
    L:  10 ** parseFloat(slL.value),
    a:  parseFloat(slA.value),
    AB: parseFloat(slAB.value),
    Ts: parseFloat(slTs.value),
  };
}

function updateLabels(s) {
  lblL.textContent  = s.L.toFixed(s.L < 0.1 ? 3 : s.L < 10 ? 2 : 1);
  lblA.textContent  = s.a.toFixed(2);
  lblAB.textContent = s.AB.toFixed(2);
  lblTs.textContent = Math.round(s.Ts);
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
const W = canvas.width;
const H = canvas.height;
const SPLIT = 0.42;          // fraction of canvas for schematic
const LEFT_W = W * SPLIT;
const RIGHT_W = W - LEFT_W;

function drawSchematic(s, Teq) {
  const cx = LEFT_W * 0.28;  // star centre x
  const cy = H / 2;

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, LEFT_W, H);

  // Star radius scaled (capped for display)
  const R_star = R_SUN * Math.sqrt(s.L) * (T_SUN / s.Ts) ** 2;
  const AU_px  = (LEFT_W * 0.62) / Math.max(s.a, 0.2);  // scale so orbit fits
  const starPx = Math.min(R_star / (AU * s.a) * AU_px * s.a, LEFT_W * 0.22);
  const starPx2 = Math.max(starPx, 8);

  // Star glow
  const grd = ctx.createRadialGradient(cx, cy, starPx2 * 0.5, cx, cy, starPx2 * 2.5);
  grd.addColorStop(0, 'rgba(255,230,100,0.35)');
  grd.addColorStop(1, 'rgba(255,230,100,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, starPx2 * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Star
  ctx.beginPath();
  ctx.arc(cx, cy, starPx2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();

  // Orbit dashed circle
  const orbitPx = AU_px * s.a;
  const planetX = cx + orbitPx;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = '#444c56';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, orbitPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Arrow from star to planet (along x-axis)
  const arrowY = cy - 22;
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx + starPx2 + 4, arrowY);
  ctx.lineTo(planetX - 6, arrowY);
  ctx.stroke();
  // arrowhead
  ctx.beginPath();
  ctx.moveTo(planetX - 6, arrowY);
  ctx.lineTo(planetX - 12, arrowY - 4);
  ctx.lineTo(planetX - 12, arrowY + 4);
  ctx.closePath();
  ctx.fillStyle = '#8b949e';
  ctx.fill();
  // label
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('a', (cx + starPx2 + planetX) / 2, arrowY - 7);

  // Planet
  const pRadius = 7;
  ctx.beginPath();
  ctx.arc(planetX, cy, pRadius, 0, Math.PI * 2);
  ctx.fillStyle = teqColor(Teq);
  ctx.fill();
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth = 1;
  ctx.stroke();

  // T_eq readout
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`T_eq = ${Math.round(Teq)} K`, LEFT_W / 2, H - 52);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#8b949e';
  ctx.fillText(`(${(Teq - 273.15).toFixed(1)} °C)`, LEFT_W / 2, H - 32);

  // Divider
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT_W, 0);
  ctx.lineTo(LEFT_W, H);
  ctx.stroke();
}

function drawBarChart(s, currentTeq) {
  const ox = LEFT_W + 10;  // origin x
  const oy = 30;           // top padding
  const chartH = H - oy - 60;
  const chartW = RIGHT_W - 20;

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(LEFT_W, 0, RIGHT_W, H);

  // Title
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('T_eq comparison (K)', ox + 4, oy - 8);

  // Build rows: 5 presets + current
  const rows = PRESET_KEYS.map((k, i) => ({
    label: PRESET_NAMES[i],
    T: calcTeq(PRESETS[k].L, PRESETS[k].a, PRESETS[k].AB, PRESETS[k].Ts),
  }));
  rows.push({ label: 'Current', T: currentTeq });

  const maxT  = Math.max(...rows.map(r => r.T), 420);
  const minT  = 0;
  const tRange = maxT - minT;

  const rowH   = chartH / rows.length;
  const barH   = rowH * 0.52;
  const labelW = 58;
  const barX0  = ox + labelW;
  const barMaxW = chartW - labelW - 52;

  // Reference lines: 273 K and 373 K
  const refLines = [
    { T: 273, label: '273 K  ice', color: '#7aa2f7' },
    { T: 373, label: '373 K  boil', color: '#f7768e' },
  ];

  for (const ref of refLines) {
    const xRef = barX0 + (ref.T / tRange) * barMaxW;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = ref.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xRef, oy - 4);
    ctx.lineTo(xRef, oy + chartH + 8);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = ref.color;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ref.label, xRef, oy + chartH + 20);
  }

  // Rows
  rows.forEach((row, i) => {
    const y   = oy + i * rowH;
    const bw  = (row.T / tRange) * barMaxW;
    const by  = y + (rowH - barH) / 2;

    // Bar
    ctx.fillStyle = teqColor(row.T);
    ctx.beginPath();
    ctx.roundRect(barX0, by, Math.max(bw, 2), barH, 3);
    ctx.fill();

    // Row label
    ctx.fillStyle = row.label === 'Current' ? '#ffd166' : '#e6edf3';
    ctx.font = row.label === 'Current' ? 'bold 12px sans-serif' : '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.label, barX0 - 5, by + barH * 0.72);

    // Value label
    ctx.fillStyle = '#e6edf3';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(row.T)} K`, barX0 + bw + 4, by + barH * 0.72);
  });

  // X-axis
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(barX0, oy + chartH + 4);
  ctx.lineTo(barX0 + barMaxW, oy + chartH + 4);
  ctx.stroke();
}

function draw() {
  const s   = getState();
  const Teq = calcTeq(s.L, s.a, s.AB, s.Ts);
  updateLabels(s);
  ctx.clearRect(0, 0, W, H);
  drawSchematic(s, Teq);
  drawBarChart(s, Teq);
}

// ─── Event wiring ─────────────────────────────────────────────────────────────
[slL, slA, slAB, slTs].forEach(sl => sl.addEventListener('input', draw));

document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    slL.value  = Math.log10(p.L).toFixed(3);
    slA.value  = p.a;
    slAB.value = p.AB;
    slTs.value = p.Ts;
    draw();
  });
});

// ─── Initial render ───────────────────────────────────────────────────────────
draw();
