import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

const canvas = document.getElementById('orbit');
const ctx = canvas.getContext('2d');
const ratioInput = document.getElementById('ratio');
const eccInput = document.getElementById('ecc');
const spdInput = document.getElementById('spd');
const ratioVal = document.getElementById('ratio-val');
const eccVal = document.getElementById('ecc-val');
const spdVal = document.getElementById('spd-val');
const toggleBtn = document.getElementById('toggle');

// m1/m2 ratio, eccentricity, speed
let massRatio = parseFloat(ratioInput.value); // m1/m2
let e = parseFloat(eccInput.value);
let speed = parseFloat(spdInput.value);
let running = true;
let M = 0; // mean anomaly
let lastT = performance.now();

// Trails: last ~80 positions for each body
const trail1 = [];
const trail2 = [];
const TRAIL_LEN = 80;

function syncLabels() {
  ratioVal.textContent = massRatio.toFixed(2);
  eccVal.textContent = e.toFixed(2);
  spdVal.textContent = speed.toFixed(1);
}

ratioInput.addEventListener('input', () => {
  massRatio = parseFloat(ratioInput.value);
  syncLabels();
  trail1.length = 0;
  trail2.length = 0;
});
eccInput.addEventListener('input', () => {
  e = parseFloat(eccInput.value);
  syncLabels();
  trail1.length = 0;
  trail2.length = 0;
});
spdInput.addEventListener('input', () => { speed = parseFloat(spdInput.value); syncLabels(); });
toggleBtn.addEventListener('click', () => {
  running = !running;
  toggleBtn.textContent = running ? 'Pause' : 'Play';
  lastT = performance.now();
});
syncLabels();

// Solve Kepler's equation M = E - e*sin(E) for E (eccentric anomaly)
// using Newton's method.
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 12; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E -= f / fp;
    if (Math.abs(f) < 1e-9) break;
  }
  return E;
}

// Returns the relative-coordinate position (rx, ry) for a given mean anomaly.
// The semi-major axis of the relative orbit is fixed at REL_A pixels.
const REL_A = 180; // semi-major axis of relative orbit, in pixels

function relativePosition(M, e) {
  const E = solveKepler(M, e);
  const rx = REL_A * (Math.cos(E) - e);
  const ry = REL_A * Math.sqrt(1 - e * e) * Math.sin(E);
  return { rx, ry };
}

// Body radii: ~proportional to cube-root of mass, clamped to [4, 14]
function bodyRadius(mass) {
  return Math.min(14, Math.max(4, 7 * Math.cbrt(mass)));
}

function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (running) {
    // mean motion scaled so speed=1 gives ~6s orbit
    const n = (2 * Math.PI / 6) * speed;
    M += n * dt;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;
  }

  const { rx, ry } = relativePosition(M, e);

  // m1 is at +(m2/M)*r, m2 is at -(m1/M)*r  (CoM frame)
  // With massRatio = m1/m2, let m2 = 1, m1 = massRatio, M_total = massRatio + 1
  const m1 = massRatio;
  const m2 = 1.0;
  const Mtotal = m1 + m2;

  const f1 = m2 / Mtotal; // fraction of r for body 1 (positive direction)
  const f2 = m1 / Mtotal; // fraction of r for body 2 (negative direction)

  const b1x = f1 * rx;
  const b1y = f1 * ry;
  const b2x = -f2 * rx;
  const b2y = -f2 * ry;

  trail1.push({ x: b1x, y: b1y });
  trail2.push({ x: b2x, y: b2y });
  if (trail1.length > TRAIL_LEN) trail1.shift();
  if (trail2.length > TRAIL_LEN) trail2.shift();

  draw(b1x, b1y, b2x, b2y, f1, f2, m1, m2);
  requestAnimationFrame(frame);
}

function drawEllipse(cx, cy, a, b, offsetX) {
  // Ellipse centered at (cx + offsetX, cy) with semi-axes a, b
  ctx.beginPath();
  ctx.ellipse(cx + offsetX, cy, a, b, 0, 0, 2 * Math.PI);
  ctx.stroke();
}

function draw(b1x, b1y, b2x, b2y, f1, f2, m1, m2) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // CoM sits at canvas center
  const cx = w / 2;
  const cy = h / 2;

  // Semi-axes of each body's ellipse about the CoM
  const a1 = f1 * REL_A;            // semi-major axis body 1
  const b1 = a1 * Math.sqrt(1 - e * e);
  const a2 = f2 * REL_A;            // semi-major axis body 2
  const b2e = a2 * Math.sqrt(1 - e * e);

  // The geometric center of each body's ellipse is offset from the focus (CoM)
  // by a*e along the major axis. Body 1 travels in the positive-r direction,
  // body 2 in the negative-r direction.
  const offset1 = -a1 * e; // geometric center of body-1 ellipse (x offset from CoM)
  const offset2 =  a2 * e; // geometric center of body-2 ellipse

  // Draw faint ellipse outlines
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  drawEllipse(cx, cy, a1, b1, offset1);
  drawEllipse(cx, cy, a2, b2e, offset2);

  // Draw trails
  function drawTrail(trail, color) {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.strokeStyle = color.replace(')', `, ${alpha * 0.7})`).replace('rgb', 'rgba');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + trail[i - 1].x, cy + trail[i - 1].y);
      ctx.lineTo(cx + trail[i].x, cy + trail[i].y);
      ctx.stroke();
    }
  }

  // Trails using rgba directly
  function drawTrailRgba(trail, r, g, b) {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.65;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + trail[i - 1].x, cy + trail[i - 1].y);
      ctx.lineTo(cx + trail[i].x, cy + trail[i].y);
      ctx.stroke();
    }
  }

  drawTrailRgba(trail1, 255, 209, 102);  // #ffd166 yellow
  drawTrailRgba(trail2, 122, 162, 247);  // #7aa2f7 blue

  // CoM marker — small "+" in muted color
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();

  // Body radii proportional to ∛mass
  const r1 = bodyRadius(m1);
  const r2 = bodyRadius(m2);

  // Body 1 (yellow, m1)
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx + b1x, cy + b1y, r1, 0, 2 * Math.PI);
  ctx.fill();

  // Body 2 (blue, m2)
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(cx + b2x, cy + b2y, r2, 0, 2 * Math.PI);
  ctx.fill();

  // Live readouts (top-left)
  ctx.fillStyle = '#e6edf3';
  ctx.font = '14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const ratioStr = massRatio >= 1
    ? `${massRatio.toFixed(2)} : 1`
    : `1 : ${(1 / massRatio).toFixed(2)}`;
  ctx.fillText(`m\u2081:m\u2082 = ${ratioStr}`, 16, 14);
  const orbitRatio = (m2 / m1).toFixed(3);
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`r\u2081/r\u2082 = m\u2082/m\u2081 = ${orbitRatio}`, 16, 34);
}

requestAnimationFrame(frame);
