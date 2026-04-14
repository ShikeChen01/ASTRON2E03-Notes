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

// trail of swept-area wedges (last N ticks)
const trail = [];
const TRAIL_LEN = 90;

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

function planetPosition(M, a, e) {
  const E = solveKepler(M, e);
  // position in the orbital plane, focus at origin
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return { x, y };
}

function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (running) {
    // mean motion: scale so a=200, speed=1 → ~6s orbit
    const n = (2 * Math.PI / 6) * speed * Math.pow(200 / a, 1.5);
    M += n * dt;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;
  }

  const { x, y } = planetPosition(M, a, e);
  trail.push({ x, y });
  if (trail.length > TRAIL_LEN) trail.shift();

  draw(x, y);
  requestAnimationFrame(frame);
}

function draw(px, py) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // center the orbit so the FOCUS (Sun) sits at canvas center
  const cx = w / 2;
  const cy = h / 2;

  // geometric center is offset by (-a*e) from the focus (Sun at cx,cy)
  const centerX = cx - a * e;

  // draw ellipse
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(centerX, cy, a, a * Math.sqrt(1 - e * e), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // major axis (faint dashed line, aphelion ↔ perihelion)
  ctx.strokeStyle = '#3a4250';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(centerX - a, cy);
  ctx.lineTo(centerX + a, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // semi-major axis highlight: geometric center → perihelion
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX, cy);
  ctx.lineTo(centerX + a, cy);
  ctx.stroke();

  // small geometric-center marker (clearly distinct from the Sun)
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, cy, 3, 0, 2 * Math.PI);
  ctx.stroke();

  // label "a" above the midpoint of the highlighted segment
  ctx.fillStyle = '#7aa2f7';
  ctx.font = 'italic 16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('a', centerX + a / 2, cy - 6);

  // swept-area wedge trail
  if (trail.length >= 2) {
    ctx.fillStyle = 'rgba(187, 154, 247, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (const p of trail) ctx.lineTo(cx + p.x, cy + p.y);
    ctx.closePath();
    ctx.fill();
  }

  // r vector: from focus (Sun) to planet
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + px, cy + py);
  ctx.stroke();

  // label "r" near the midpoint of the focus→planet segment, offset
  // perpendicular to the line so it doesn't sit on top of the wedge
  const rLen = Math.hypot(px, py);
  if (rLen > 30) {
    const nx = -py / rLen;
    const ny = px / rLen;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'italic 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('r', cx + px / 2 + nx * 12, cy + py / 2 + ny * 12);
  }

  // Sun at the focus
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fill();

  // planet
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(cx + px, cy + py, 5, 0, 2 * Math.PI);
  ctx.fill();

  // numeric readout (top-left): live r vs constant a
  ctx.fillStyle = '#e6edf3';
  ctx.font = '14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`a = ${a.toFixed(0)}`, 16, 14);
  ctx.fillText(`r = ${rLen.toFixed(0)}`, 16, 32);
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`r ranges ${(a * (1 - e)).toFixed(0)} → ${(a * (1 + e)).toFixed(0)}`, 16, 52);
}

requestAnimationFrame(frame);
