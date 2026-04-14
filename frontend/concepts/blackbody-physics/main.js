import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// Physical constants (SI)
const h = 6.626e-34;   // Planck's constant (J·s)
const c = 3e8;          // speed of light (m/s)
const k = 1.381e-23;   // Boltzmann's constant (J/K)
const sigma = 5.67e-8; // Stefan–Boltzmann (W m⁻² K⁻⁴)

// Preset temperatures
const PRESETS = {
  sun:     5778,
  earth:   288,
  jupiter: 125,
};

// Planck spectral radiance B_lambda(T) in W m⁻² m⁻¹ sr⁻¹
// lambda in metres, T in kelvin
function planck(lambda, T) {
  const exponent = (h * c) / (lambda * k * T);
  if (exponent > 700) return 0; // underflow guard
  return (2 * h * c * c) / (Math.pow(lambda, 5) * (Math.exp(exponent) - 1));
}

// Wien peak wavelength in metres
function wienPeak(T) {
  return 2.898e-3 / T;
}

// ── Canvas setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('bb-canvas');
const ctx    = canvas.getContext('2d');

// Plot area margins (px)
const M = { top: 40, right: 30, bottom: 55, left: 70 };
const W = canvas.width  - M.left - M.right;
const H = canvas.height - M.top  - M.bottom;

// X axis: wavelength µm, log scale, 0.1 → 1000
const X_MIN = 0.1, X_MAX = 1000;
function xToCanvas(lam_um) {
  return M.left + (Math.log10(lam_um) - Math.log10(X_MIN)) /
         (Math.log10(X_MAX) - Math.log10(X_MIN)) * W;
}

// Y axis: log scale, determined per-draw from data
let yMin, yMax; // log10 values, set in draw()
function yToCanvas(val) {
  if (val <= 0) return M.top + H;
  const l = Math.log10(val);
  return M.top + H - (l - yMin) / (yMax - yMin) * H;
}

// Build array of wavelengths in µm (log-spaced)
const N_POINTS = 600;
const lambdas_um = Array.from({ length: N_POINTS }, (_, i) =>
  Math.pow(10, Math.log10(X_MIN) + (i / (N_POINTS - 1)) * (Math.log10(X_MAX) - Math.log10(X_MIN)))
);
const lambdas_m = lambdas_um.map(l => l * 1e-6);

// Compute Planck values for a given T, normalised to peak=1
function planckNormalized(T) {
  const raw = lambdas_m.map(lm => planck(lm, T));
  const peak = Math.max(...raw);
  return raw.map(v => (peak > 0 ? v / peak : 0));
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawGrid() {
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  ctx.setLineDash([]);

  // Vertical grid lines at decade values
  [0.1, 1, 10, 100, 1000].forEach(lam => {
    const x = xToCanvas(lam);
    ctx.beginPath();
    ctx.moveTo(x, M.top);
    ctx.lineTo(x, M.top + H);
    ctx.stroke();
  });

  // Horizontal grid lines at integer log10 steps
  for (let ly = Math.ceil(yMin); ly <= Math.floor(yMax); ly++) {
    const y = yToCanvas(Math.pow(10, ly));
    ctx.beginPath();
    ctx.moveTo(M.left, y);
    ctx.lineTo(M.left + W, y);
    ctx.stroke();
  }
}

function drawAxes() {
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);

  // X axis
  ctx.beginPath();
  ctx.moveTo(M.left, M.top + H);
  ctx.lineTo(M.left + W, M.top + H);
  ctx.stroke();

  // Y axis
  ctx.beginPath();
  ctx.moveTo(M.left, M.top);
  ctx.lineTo(M.left, M.top + H);
  ctx.stroke();

  // X tick labels
  ctx.fillStyle  = '#8b949e';
  ctx.font       = '12px monospace';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'top';
  [0.1, 1, 10, 100, 1000].forEach(lam => {
    const x = xToCanvas(lam);
    ctx.beginPath();
    ctx.moveTo(x, M.top + H);
    ctx.lineTo(x, M.top + H + 5);
    ctx.strokeStyle = '#8b949e';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(lam < 1 ? lam.toString() : lam.toString(), x, M.top + H + 8);
  });

  // X axis label
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('wavelength (µm)', M.left + W / 2, M.top + H + 32);

  // Y axis label
  ctx.save();
  ctx.translate(14, M.top + H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('spectral radiance (log, normalised)', 0, 0);
  ctx.restore();
}

function drawVisibleBand() {
  // 0.38–0.75 µm shaded with rainbow gradient
  const x0 = xToCanvas(0.38);
  const x1 = xToCanvas(0.75);
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0,    'rgba(128,  0,255,0.12)');  // violet
  grad.addColorStop(0.2,  'rgba(  0, 80,255,0.12)');  // blue
  grad.addColorStop(0.4,  'rgba(  0,200, 80,0.10)');  // green
  grad.addColorStop(0.65, 'rgba(255,220,  0,0.10)');  // yellow
  grad.addColorStop(1,    'rgba(255, 50,  0,0.13)');  // red
  ctx.fillStyle = grad;
  ctx.fillRect(x0, M.top, x1 - x0, H);

  // label
  ctx.fillStyle = 'rgba(230,237,243,0.35)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('visible', (x0 + x1) / 2, M.top + 8);
}

function drawCurve(values, color, lineWidth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.setLineDash([]);
  let first = true;
  for (let i = 0; i < lambdas_um.length; i++) {
    const v = values[i];
    if (v <= 0) { first = true; continue; }
    const x = xToCanvas(lambdas_um[i]);
    const y = yToCanvas(v);
    if (first) { ctx.moveTo(x, y); first = false; }
    else        { ctx.lineTo(x, y); }
  }
  ctx.stroke();
}

function drawWienLine(T) {
  const lam_um = wienPeak(T) * 1e6;
  if (lam_um < X_MIN || lam_um > X_MAX) return;
  const x = xToCanvas(lam_um);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, M.top);
  ctx.lineTo(x, M.top + H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ffd166';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  const labelX = x + 4;
  ctx.fillText('λ_max', labelX > M.left + W - 42 ? x - 46 : labelX, M.top + 16);
}

function drawReadout(T) {
  const lam_um   = wienPeak(T) * 1e6;
  const flux     = sigma * Math.pow(T, 4);
  const lines = [
    `T = ${T} K`,
    `λ_max = ${lam_um.toFixed(3)} µm`,
    `F = σT⁴ = ${flux.toExponential(2)} W m⁻²`,
  ];
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.fillStyle = 'rgba(10,13,18,0.75)';
    const tw = ctx.measureText(line).width;
    ctx.fillRect(M.left + 8, M.top + 8 + i * 18, tw + 8, 16);
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(line, M.left + 12, M.top + 20 + i * 18);
  });
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw(T) {
  // Compute normalised curves
  const mainCurve  = planckNormalized(T);
  const ghostCurves = Object.values(PRESETS).map(pt => planckNormalized(pt));

  // Y range: log10 of normalised values — always 1e-10 to 1
  yMin = -10;
  yMax =  0;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawVisibleBand();
  drawGrid();
  drawAxes();

  // Ghost curves
  ghostCurves.forEach(gc => drawCurve(gc, 'rgba(48,54,61,0.9)', 1.5));

  // Main curve
  drawCurve(mainCurve, '#bb9af7', 2.5);

  drawWienLine(T);
  drawReadout(T);
}

// ── Controls ──────────────────────────────────────────────────────────────────
const slider   = document.getElementById('temp');
const tempVal  = document.getElementById('temp-val');

function update(T) {
  T = Math.round(T / 50) * 50;
  slider.value   = T;
  tempVal.textContent = T;
  draw(T);
}

slider.addEventListener('input', () => update(Number(slider.value)));

document.getElementById('btn-sun').addEventListener('click',     () => update(PRESETS.sun));
document.getElementById('btn-earth').addEventListener('click',   () => update(PRESETS.earth));
document.getElementById('btn-jupiter').addEventListener('click', () => update(PRESETS.jupiter));

// Initial render
update(5778);
