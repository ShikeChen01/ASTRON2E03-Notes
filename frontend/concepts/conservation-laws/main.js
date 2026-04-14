import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

const canvas = document.getElementById('orbit');
const ctx = canvas.getContext('2d');
const eccInput = document.getElementById('ecc');
const smaInput = document.getElementById('sma');
const spdInput = document.getElementById('spd');
const eccVal = document.getElementById('ecc-val');
const smaVal = document.getElementById('sma-val');
const spdVal = document.getElementById('spd-val');
const toggleBtn = document.getElementById('toggle');

let e = parseFloat(eccInput.value);
let a = parseFloat(smaInput.value);
let speed = parseFloat(spdInput.value);
let running = true;
let M = 0; // mean anomaly
let lastT = performance.now();

// Normalized units: GM = 1, mu = 1 (reduced mass).
// Scale factor converts canvas-pixel lengths to dimensionless orbital units.
// We pick SCALE so that a=180px maps to a=1 in dimensionless units.
// Then all energies are dimensionless numbers of order ~1.
const A_REF = 180; // reference semi-major axis in pixels

function syncLabels() {
  eccVal.textContent = e.toFixed(2);
  smaVal.textContent = a.toFixed(0);
  spdVal.textContent = speed.toFixed(1);
}

eccInput.addEventListener('input', () => { e = parseFloat(eccInput.value); syncLabels(); });
smaInput.addEventListener('input', () => { a = parseFloat(smaInput.value); syncLabels(); });
spdInput.addEventListener('input', () => { speed = parseFloat(spdInput.value); syncLabels(); });
toggleBtn.addEventListener('click', () => {
  running = !running;
  toggleBtn.textContent = running ? 'Pause' : 'Play';
  lastT = performance.now();
});
syncLabels();

// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
// using Newton's method (same as kepler-laws/main.js).
function solveKepler(Manom, ecc) {
  let E = Manom;
  for (let i = 0; i < 12; i++) {
    const f = E - ecc * Math.sin(E) - Manom;
    const fp = 1 - ecc * Math.cos(E);
    E -= f / fp;
    if (Math.abs(f) < 1e-9) break;
  }
  return E;
}

// Returns position (x, y) in canvas pixels, with focus at origin.
function planetPosition(Manom, aSemi, ecc) {
  const E = solveKepler(Manom, ecc);
  const x = aSemi * (Math.cos(E) - ecc);
  const y = aSemi * Math.sqrt(1 - ecc * ecc) * Math.sin(E);
  return { x, y, E };
}

// Returns velocity components (vx, vy) in canvas-px / orbital-time units.
// Derived from differentiating x(E), y(E) with respect to mean anomaly M
// and using dE/dt = n / (1 - e cos E).
function planetVelocity(E, aSemi, ecc, n) {
  const denom = 1 - ecc * Math.cos(E);
  const vx = -aSemi * Math.sin(E) * n / denom;
  const vy = aSemi * Math.sqrt(1 - ecc * ecc) * Math.cos(E) * n / denom;
  return { vx, vy };
}

// Compute conserved quantities in dimensionless units (GM=1, mu=1).
// r is in canvas pixels; we normalise by A_REF so a_norm and r_norm are ~1.
function conservedQuantities(x, y, vx, vy, aSemi, ecc, n) {
  const a_norm = aSemi / A_REF;
  const r_norm = Math.hypot(x, y) / A_REF;

  // velocities in normalised units: divide by A_REF * n  (so v_norm = v_px / (A_REF * n))
  // Then vis-viva: v^2 = GM(2/r - 1/a) = (2/r_norm - 1/a_norm) in GM=1 units
  const v2_norm = 2 / r_norm - 1 / a_norm;   // vis-viva; always >= 0 for bound orbit

  const KE =  0.5 * v2_norm;                  // ½ mu v² with mu=GM=1
  const PE = -1 / r_norm;                     // -GM mu / r with GM=mu=1
  const E_total = KE + PE;                    // should equal -1/(2*a_norm)

  // Angular momentum: L = |r × v|; in normalised coords
  // r_norm_vec = (x/A_REF, y/A_REF), v_norm_vec = (vx,vy)/(A_REF*n)
  const rx = x / A_REF;
  const ry = y / A_REF;
  const vxn = vx / (A_REF * n);
  const vyn = vy / (A_REF * n);
  const L = Math.abs(rx * vyn - ry * vxn);   // |r × v| (z-component magnitude)

  return { KE, PE, E_total, L };
}

// Layout constants for the gauge panel drawn inside the canvas.
// The gauge area occupies x: LABEL_W .. LABEL_W + TRACK_W
// Zero line sits in the middle of the track.
const GAUGE = {
  labelW: 52,       // width reserved for the row label (left of track)
  trackX: 52,       // x where the track begins
  trackW: 360,      // total track width (half: 180px each side of zero)
  halfW: 180,       // pixels per unit on each side of the zero line
  y: 355,           // top of first gauge row
  rowH: 33,         // row-to-row spacing
  barH: 14,         // bar height
};
// Zero line sits at trackX + halfW
const ZERO_X = GAUGE.trackX + GAUGE.halfW;

function drawGauge(label, value, maxAbs, color, row, refValue) {
  const gy = GAUGE.y + row * GAUGE.rowH;
  const bh = GAUGE.barH;
  const tx = GAUGE.trackX;
  const tw = GAUGE.trackW;

  // Background track
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(tx, gy, tw, bh);

  // Zero line
  ctx.strokeStyle = '#484f5e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ZERO_X, gy - 2);
  ctx.lineTo(ZERO_X, gy + bh + 2);
  ctx.stroke();

  // Bar: positive → right of zero, negative → left of zero
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, value));
  const barLen = Math.abs(clamped) / maxAbs * GAUGE.halfW;
  ctx.fillStyle = color;
  if (value >= 0) {
    ctx.fillRect(ZERO_X, gy, barLen, bh);
  } else {
    ctx.fillRect(ZERO_X - barLen, gy, barLen, bh);
  }

  // Reference hairline (dashed) for total energy expected value
  if (refValue !== undefined) {
    const refClamped = Math.max(-maxAbs, Math.min(maxAbs, refValue));
    const refLen = Math.abs(refClamped) / maxAbs * GAUGE.halfW;
    const refX = refValue >= 0 ? ZERO_X + refLen : ZERO_X - refLen;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(refX, gy - 3);
    ctx.lineTo(refX, gy + bh + 3);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Row label (left of track, right-aligned)
  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, GAUGE.trackX - 4, gy + bh / 2);

  // Numeric value (right of track)
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(value.toFixed(3), tx + tw + 6, gy + bh / 2);
}

function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  // Mean motion: same scaling as kepler-laws so speed=1, a=A_REF → ~6s orbit.
  const n = (2 * Math.PI / 6) * speed * Math.pow(A_REF / a, 1.5);

  if (running) {
    M += n * dt;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;
  }

  const { x, y, E: eccAnom } = planetPosition(M, a, e);
  const { vx, vy } = planetVelocity(eccAnom, a, e, n);
  const { KE, PE, E_total, L } = conservedQuantities(x, y, vx, vy, a, e, n);

  draw(x, y, KE, PE, E_total, L);
  requestAnimationFrame(frame);
}

function draw(px, py, KE, PE, E_total, L) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Focus (Sun) at canvas center.
  const cx = w / 2;
  const cy = (h - 160) / 2; // shift orbit up a bit to leave room for gauges
  const centerX = cx - a * e; // geometric center of ellipse

  // --- Orbit ellipse ---
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(centerX, cy, a, a * Math.sqrt(1 - e * e), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Dashed major axis
  ctx.strokeStyle = '#3a4250';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(centerX - a, cy);
  ctx.lineTo(centerX + a, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // r vector from focus to planet
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + px, cy + py);
  ctx.stroke();

  // Sun at focus
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fill();

  // Planet
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(cx + px, cy + py, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Perihelion and aphelion markers
  const peri = cx + a * (1 - e);
  const aph = cx - a * (1 + e);
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('peri', peri, cy + 12);
  ctx.fillText('aph', aph, cy + 12);

  // --- Top-left readout: L (constant) ---
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`L = ${L.toFixed(3)}`, 16, 14);
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.fillText('(angular momentum — should not drift)', 16, 30);

  // --- Gauge panel background ---
  const gaugeTop = GAUGE.y - 16;
  const gaugeBottom = GAUGE.y + 3 * GAUGE.rowH + 6;
  const gaugePanelW = GAUGE.trackX + GAUGE.trackW + 70; // label + track + number
  ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
  ctx.fillRect(0, gaugeTop, gaugePanelW, gaugeBottom - gaugeTop);

  // Gauge header
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Energy gauges (live)    ← negative | positive →', GAUGE.trackX, gaugeTop + 2);

  // maxAbs for scale: use |E_expected| * 3 so KE and PE bars each fit at max eccentricity.
  // At perihelion: KE_max = -E + |E| = -2E = 1/a_norm, PE_min = -1/r_peri = -1/(a_norm*(1-e))
  // Scale so the larger of those sits at ~90% of half-track.
  const a_norm = a / A_REF;
  const E_expected = -1 / (2 * a_norm);
  const scale = Math.max(Math.abs(E_expected) * 3, 0.05);

  // Row 0: KE (blue, always positive → extends right)
  drawGauge('KE', KE, scale, '#7aa2f7', 0, undefined);

  // Row 1: PE (purple, always negative → extends left)
  drawGauge('PE', PE, scale, '#bb9af7', 1, undefined);

  // Row 2: E total (yellow — should be constant; show expected hairline)
  drawGauge('E total', E_total, scale, '#ffd166', 2, E_expected);

  // Label for the expected-E hairline, rendered just above the E row
  const refLen = Math.abs(E_expected) / scale * GAUGE.halfW;
  const refX = ZERO_X - refLen;
  ctx.fillStyle = '#ffd166';
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('expected E', refX, GAUGE.y + 2 * GAUGE.rowH - 1);
}

requestAnimationFrame(frame);
