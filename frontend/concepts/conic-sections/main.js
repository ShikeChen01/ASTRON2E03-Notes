import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ── DOM refs ────────────────────────────────────────────────────────────────
const canvas     = document.getElementById('conic');
const ctx        = canvas.getContext('2d');
const eccInput   = document.getElementById('ecc');
const eccVal     = document.getElementById('ecc-val');
const typeLabel  = document.getElementById('orbit-type');

// ── State ────────────────────────────────────────────────────────────────────
const P = 150;          // semi-latus rectum in px (fixed scale reference)

let e = parseFloat(eccInput.value);

// Arc-length marker state
// We parameterise the marker by θ and step it by Δθ each frame,
// but normalise Δθ so the *arc-length* step is constant.
let markerTheta = 0;    // current θ of marker
let lastTime    = performance.now();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** r(θ) from the orbit equation. Returns null when the denominator ≤ 0. */
function r(theta, ecc) {
  const denom = 1 + ecc * Math.cos(theta);
  if (denom <= 1e-9) return null;
  return P / denom;
}

/**
 * Convert polar (r, θ) to canvas XY.
 * Focus sits at (focusX, focusY) on the canvas; the perihelion is to the RIGHT.
 */
function polarToCanvas(rVal, theta, focusX, focusY) {
  return {
    x: focusX + rVal * Math.cos(theta),
    y: focusY - rVal * Math.sin(theta),   // canvas y-axis is flipped
  };
}

/**
 * Build the θ range that yields positive r for a given eccentricity.
 * For e < 1 (bound): full [0, 2π].
 * For e >= 1 (open): (-θmax, +θmax) where θmax = arccos(-1/e) – epsilon.
 */
function thetaRange(ecc) {
  if (ecc < 1) {
    return { tMin: 0, tMax: 2 * Math.PI, closed: true };
  }
  // 1 + e·cos(θ) > 0  →  cos(θ) > -1/e  →  |θ| < arccos(-1/e)
  const limit = Math.acos(-1 / ecc);
  const eps   = 0.01;   // stay away from asymptote
  return { tMin: -(limit - eps), tMax: limit - eps, closed: false };
}

/**
 * Estimate ds/dθ (arc length per unit θ) at a given θ for use in constant
 * arc-length stepping: ds = sqrt(r² + (dr/dθ)²) dθ  (polar arc-length formula).
 */
function arcLengthElem(theta, ecc) {
  const denom  = 1 + ecc * Math.cos(theta);
  if (Math.abs(denom) < 1e-9) return Infinity;
  const rVal   = P / denom;
  const drDth  = P * ecc * Math.sin(theta) / (denom * denom);
  return Math.sqrt(rVal * rVal + drDth * drDth);
}

// ── Label sync ───────────────────────────────────────────────────────────────
function getType(ecc) {
  if (ecc < 1e-4)      return 'circle';
  if (ecc < 1 - 1e-4)  return 'ellipse';
  if (ecc < 1 + 1e-4)  return 'parabola';
  return 'hyperbola';
}

function syncLabel() {
  eccVal.textContent   = e.toFixed(2);
  const type = getType(e);
  typeLabel.innerHTML  = `Type: <strong>${type}</strong>`;
}

eccInput.addEventListener('input', () => {
  e = parseFloat(eccInput.value);
  // Reset marker to perihelion when eccentricity changes
  markerTheta = 0;
  syncLabel();
});

syncLabel();

// ── Drawing ──────────────────────────────────────────────────────────────────
function drawConic(focusX, focusY) {
  const { tMin, tMax, closed } = thetaRange(e);
  const steps = 800;
  const dTheta = (tMax - tMin) / steps;

  const type = getType(e);
  let curveColor;
  if      (type === 'circle' || type === 'ellipse') curveColor = '#7aa2f7';
  else if (type === 'parabola')                      curveColor = '#ffd166';
  else                                               curveColor = '#f7768e';

  ctx.strokeStyle = curveColor;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();

  let firstPoint = true;
  for (let i = 0; i <= steps; i++) {
    const theta = tMin + i * dTheta;
    const rVal  = r(theta, e);
    if (rVal === null || rVal > 1200) continue;   // skip asymptotic spikes
    const { x, y } = polarToCanvas(rVal, theta, focusX, focusY);
    if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; }
    else            { ctx.lineTo(x, y); }
  }

  if (closed) ctx.closePath();
  ctx.stroke();
}

function drawAsymptotes(focusX, focusY) {
  if (e <= 1) return;
  const limit = Math.acos(-1 / e);
  // The asymptote direction is ±limit from the positive x-axis (perihelion side).
  // Draw both forward (r→∞) directions.
  ctx.strokeStyle = 'rgba(247, 118, 142, 0.28)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([6, 6]);

  for (const sign of [1, -1]) {
    const theta = sign * limit;
    // long ray from focus outward in direction θ (into the far field)
    const len = 600;
    ctx.beginPath();
    ctx.moveTo(focusX, focusY);
    ctx.lineTo(
      focusX + len * Math.cos(theta),
      focusY - len * Math.sin(theta),
    );
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawFocus(focusX, focusY) {
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(focusX, focusY, 7, 0, 2 * Math.PI);
  ctx.fill();
}

function drawMarker(focusX, focusY) {
  const rVal = r(markerTheta, e);
  if (rVal === null || rVal > 1200) return;
  const { x, y } = polarToCanvas(rVal, markerTheta, focusX, focusY);

  const type = getType(e);
  let color;
  if      (type === 'circle' || type === 'ellipse') color = '#7aa2f7';
  else if (type === 'parabola')                      color = '#ffd166';
  else                                               color = '#f7768e';

  // white ring + colored fill
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth   = 2;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

function drawReadout(focusX, focusY) {
  const rVal = r(markerTheta, e);
  const type = getType(e);

  ctx.fillStyle    = '#e6edf3';
  ctx.font         = '14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`e = ${e.toFixed(2)}`, 16, 14);
  if (rVal !== null && rVal < 1200) {
    ctx.fillText(`r = ${rVal.toFixed(0)} px`, 16, 32);
  }
  ctx.fillStyle = '#8b949e';
  ctx.font      = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`p = ${P} px`, 16, 52);

  // perihelion / aphelion note
  const rPeri = P / (1 + e);
  if (type === 'circle') {
    ctx.fillText(`r = p = ${rPeri.toFixed(0)} (constant)`, 16, 68);
  } else if (type === 'ellipse') {
    const rAph = P / (1 - e);
    ctx.fillText(`perihelion ${rPeri.toFixed(0)}  aphelion ${rAph.toFixed(0)}`, 16, 68);
  } else if (type === 'parabola') {
    ctx.fillText(`perihelion (q) = p/2 = ${rPeri.toFixed(0)}`, 16, 68);
  } else {
    ctx.fillText(`perihelion ${rPeri.toFixed(0)}  (open orbit)`, 16, 68);
  }
}

// ── Animation loop ────────────────────────────────────────────────────────────

/** Constant arc-length speed (px/s along the curve) */
const ARC_SPEED = 60;   // px per second

function advanceMarker(dt) {
  const { tMin, tMax, closed } = thetaRange(e);

  // We want to move `ARC_SPEED * dt` px along the curve.
  // ds = arcLengthElem(θ) * dθ  →  dθ = ds / arcLengthElem(θ)
  const ds    = ARC_SPEED * dt;
  const dsElem = arcLengthElem(markerTheta, e);
  const dTheta = dsElem > 0 ? ds / dsElem : 0;

  markerTheta += dTheta;

  if (closed) {
    // wrap around full 2π
    if (markerTheta > tMax) markerTheta -= (tMax - tMin);
  } else {
    // bounce back and forth across the valid range for open orbits
    if (markerTheta > tMax) {
      markerTheta = tMax - (markerTheta - tMax);
      // flip direction by reversing sign of subsequent steps
      // Simpler: just restart from tMin
      markerTheta = tMin;
    }
    // Also clamp to range
    if (markerTheta < tMin) markerTheta = tMin;
  }
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  advanceMarker(dt);

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Focus sits slightly right of center to give more room for leftward
  // open-orbit branches (parabola / hyperbola open toward the left when
  // perihelion is to the right of the focus).
  const focusX = w * 0.55;
  const focusY = h / 2;

  drawAsymptotes(focusX, focusY);
  drawConic(focusX, focusY);
  drawFocus(focusX, focusY);
  drawMarker(focusX, focusY);
  drawReadout(focusX, focusY);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
