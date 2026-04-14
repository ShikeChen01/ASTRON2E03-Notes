import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas    = document.getElementById('hydrostatic');
const ctx       = canvas.getContext('2d');
const massInput = document.getElementById('mass');
const radInput  = document.getElementById('radius');
const massVal   = document.getElementById('mass-val');
const radVal    = document.getElementById('radius-val');

// ── Physical constants ────────────────────────────────────────────────────────
const G        = 6.674e-11;   // N·m²/kg²
const M_EARTH  = 5.972e24;    // kg
const R_EARTH  = 6.371e6;     // m

// ── State (slider values in Earth units) ─────────────────────────────────────
let M = parseFloat(massInput.value);   // Earth masses
let R = parseFloat(radInput.value);    // Earth radii

// ── Helpers ───────────────────────────────────────────────────────────────────
function computePhysics(M_eu, R_eu) {
  const M_kg  = M_eu * M_EARTH;
  const R_m   = R_eu * R_EARTH;
  const vol   = (4 / 3) * Math.PI * R_m ** 3;
  const rho   = M_kg / vol;                                     // kg/m³
  const Pc    = (3 * G * M_kg ** 2) / (8 * Math.PI * R_m ** 4); // Pa
  return { M_kg, R_m, rho, Pc };
}

/** Format a number as X.XX × 10^Y */
function sciNote(x) {
  if (x === 0) return '0';
  const exp  = Math.floor(Math.log10(Math.abs(x)));
  const mant = x / Math.pow(10, exp);
  return `${mant.toFixed(2)} \u00d7 10^${exp}`;
}

// ── Label sync ────────────────────────────────────────────────────────────────
function syncLabels() {
  massVal.textContent = M.toFixed(2);
  radVal.textContent  = R.toFixed(2);
}

// ── Event listeners ───────────────────────────────────────────────────────────
massInput.addEventListener('input', () => { M = parseFloat(massInput.value); syncLabels(); draw(); });
radInput.addEventListener('input',  () => { R = parseFloat(radInput.value);  syncLabels(); draw(); });

document.getElementById('btn-earth').addEventListener('click',   () => setPreset(1.0,    1.0));
document.getElementById('btn-mars').addEventListener('click',    () => setPreset(0.107,  0.532));
document.getElementById('btn-jupiter').addEventListener('click', () => setPreset(318,    11.2));
document.getElementById('btn-neptune').addEventListener('click', () => setPreset(17.1,   3.88));

function setPreset(m, r) {
  M = m; R = r;
  massInput.value = m;
  radInput.value  = r;
  syncLabels();
  draw();
}

syncLabels();

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { M_kg, R_m, rho, Pc } = computePhysics(M, R);

  // Layout: left panel takes ~60% width, right panel ~40%
  const PADDING   = 24;
  const DIVIDER   = Math.round(W * 0.58);   // x-coordinate of divider

  // ── Background panels ────────────────────────────────────────────────────
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#161b22';
  roundRect(ctx, PADDING / 2, PADDING / 2, DIVIDER - PADDING, H - PADDING, 8);
  ctx.fill();

  ctx.fillStyle = '#161b22';
  roundRect(ctx, DIVIDER + PADDING / 2, PADDING / 2, W - DIVIDER - PADDING, H - PADDING, 8);
  ctx.fill();

  drawPlanet(PADDING / 2, PADDING / 2, DIVIDER - PADDING, H - PADDING, Pc);
  drawGraph(DIVIDER + PADDING / 2, PADDING / 2, W - DIVIDER - PADDING, H - PADDING, Pc);
  drawReadout(M_kg, R_m, rho, Pc);
}

/** Draw a rounded rectangle path (no fill/stroke — caller does that) */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

// ── Left panel: planet cross-section ─────────────────────────────────────────
function drawPlanet(px, py, pw, ph, Pc) {
  // Usable area inside panel
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const maxR = Math.min(pw, ph) / 2 - 16;   // visual radius of planet

  // Radial gradient: yellow center → orange → dark blue at surface
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0,    '#ffd166');   // center: bright yellow
  grad.addColorStop(0.35, '#f4a261');   // warm orange
  grad.addColorStop(0.65, '#e76f51');   // deeper orange-red
  grad.addColorStop(0.85, '#264653');   // dark teal
  grad.addColorStop(1,    '#1a2332');   // near-black blue at surface

  // Draw filled planet disc
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, 2 * Math.PI);
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw 10 concentric pressure shells as subtle rings
  const N_SHELLS = 10;
  for (let i = 1; i <= N_SHELLS; i++) {
    const frac = i / N_SHELLS;           // r/R
    const pr   = frac * maxR;
    const alpha = 0.18 * (1 - frac);     // innermost rings more visible
    ctx.beginPath();
    ctx.arc(cx, cy, pr, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(230, 237, 243, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, 2 * Math.PI);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffd166';
  ctx.fill();

  // Labels
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Planet cross-section', cx, py + ph - 18);

  // R arrow annotation
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#7aa2f7';
  ctx.font = 'italic 14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('R', cx + maxR / 2, cy - 5);
}

// ── Right panel: P(r)/Pc vs r/R ──────────────────────────────────────────────
function drawGraph(px, py, pw, ph, Pc) {
  const PAD_L = 52, PAD_R = 16, PAD_T = 24, PAD_B = 40;
  const gx = px + PAD_L;           // graph origin x
  const gy = py + PAD_T;           // graph origin y (top)
  const gw = pw - PAD_L - PAD_R;   // graph width
  const gh = ph - PAD_T - PAD_B;   // graph height

  // Axes
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Y-axis
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy + gh);
  // X-axis
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('r / R', gx + gw / 2, gy + gh + 6);

  ctx.save();
  ctx.translate(gx - 38, gy + gh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P(r) / Pc', 0, 0);
  ctx.restore();

  // Tick labels — x axis
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of [0, 0.25, 0.5, 0.75, 1.0]) {
    const tx = gx + t * gw;
    ctx.fillStyle = '#8b949e';
    ctx.fillText(t.toFixed(2), tx, gy + gh + 6);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, gy + gh);
    ctx.lineTo(tx, gy + gh + 4);
    ctx.stroke();
  }

  // Tick labels — y axis
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const t of [0, 0.25, 0.5, 0.75, 1.0]) {
    const ty = gy + gh - t * gh;
    ctx.fillStyle = '#8b949e';
    ctx.fillText(t.toFixed(2), gx - 6, ty);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(gx - 4, ty);
    ctx.lineTo(gx, ty);
    ctx.stroke();
  }

  // Horizontal grid lines (subtle)
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 4]);
  for (const t of [0.25, 0.5, 0.75]) {
    const ty = gy + gh - t * gh;
    ctx.beginPath();
    ctx.moveTo(gx, ty);
    ctx.lineTo(gx + gw, ty);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Parabolic curve: P/Pc = 1 - (r/R)²
  ctx.strokeStyle = '#bb9af7';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const STEPS = 120;
  for (let i = 0; i <= STEPS; i++) {
    const frac = i / STEPS;            // r/R from 0 to 1
    const pNorm = 1 - frac * frac;     // P(r)/Pc
    const cx_pt = gx + frac * gw;
    const cy_pt = gy + gh - pNorm * gh;
    if (i === 0) ctx.moveTo(cx_pt, cy_pt);
    else         ctx.lineTo(cx_pt, cy_pt);
  }
  ctx.stroke();

  // Mark center point (r=0, P=Pc)
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(gx, gy, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pc', gx + 8, gy);

  // Mark surface point (r=R, P=0)
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(gx + gw, gy + gh, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#7aa2f7';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('P=0', gx + gw - 8, gy + gh - 6);

  // Title
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Pressure profile', gx + gw / 2, py + 4);
}

// ── Live readout (top-left of left panel) ─────────────────────────────────────
function drawReadout(M_kg, R_m, rho, Pc) {
  const x0 = 20;
  const y0 = 18;
  const lineH = 18;

  const rho_gcm3 = rho / 1000;
  const Pc_Mbar  = Pc  / 1e11;

  const lines = [
    `M = ${sciNote(M_kg)} kg`,
    `R = ${sciNote(R_m)} m`,
    `\u03c1\u0305 = ${rho_gcm3.toFixed(2)} g/cm\u00b3`,
    `Pc = ${Pc_Mbar.toFixed(2)} Mbar`,
  ];

  // Semi-transparent background
  ctx.fillStyle = 'rgba(13, 17, 23, 0.72)';
  ctx.fillRect(x0 - 4, y0 - 4, 220, lines.length * lineH + 8);

  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    // Highlight value parts
    ctx.fillStyle = (i === lines.length - 1) ? '#ffd166' : '#e6edf3';
    ctx.fillText(line, x0, y0 + i * lineH);
  });
}

// ── Initial draw ──────────────────────────────────────────────────────────────
draw();
