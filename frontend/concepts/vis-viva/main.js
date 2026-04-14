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

// Previous planet position for numerical velocity derivative (px, focus-relative)
let prevPos = null;
let prevDt = null;

function syncLabels() {
  eccVal.textContent = e.toFixed(2);
  smaVal.textContent = a.toFixed(0);
  spdVal.textContent = speed.toFixed(1);
}

eccInput.addEventListener('input', () => {
  e = parseFloat(eccInput.value);
  prevPos = null; // reset derivative when orbit parameters change
  syncLabels();
});
smaInput.addEventListener('input', () => {
  a = parseFloat(smaInput.value);
  prevPos = null;
  syncLabels();
});
spdInput.addEventListener('input', () => {
  speed = parseFloat(spdInput.value);
  prevPos = null;
  syncLabels();
});
toggleBtn.addEventListener('click', () => {
  running = !running;
  toggleBtn.textContent = running ? 'Pause' : 'Play';
  lastT = performance.now();
  prevPos = null; // avoid a spurious large dt on resume
});
syncLabels();

// Solve Kepler's equation  M = E − e·sin(E)  for the eccentric anomaly E.
function solveKepler(M_val, ecc) {
  let E = M_val;
  for (let i = 0; i < 12; i++) {
    const f  = E - ecc * Math.sin(E) - M_val;
    const fp = 1 - ecc * Math.cos(E);
    E -= f / fp;
    if (Math.abs(f) < 1e-9) break;
  }
  return E;
}

// Planet position in the orbital plane, focus at origin, in pixels.
function planetPosition(M_val, a_val, ecc) {
  const E = solveKepler(M_val, ecc);
  return {
    x: a_val * (Math.cos(E) - ecc),
    y: a_val * Math.sqrt(1 - ecc * ecc) * Math.sin(E),
  };
}

// Draw a filled arrowhead at (x,y) pointing along (dx,dy).
function drawArrowhead(x, y, dx, dy, size) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy,     py = ux; // perpendicular unit
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size + px * size * 0.5, y - uy * size + py * size * 0.5);
  ctx.lineTo(x - ux * size - px * size * 0.5, y - uy * size - py * size * 0.5);
  ctx.closePath();
  ctx.fill();
}

function frame(now) {
  const rawDt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (running) {
    // Mean motion with Kepler III scaling: n ∝ a^(−3/2)
    // Chosen so a=180, speed=1 → ~6 s orbit.
    const n = (2 * Math.PI / 6) * speed * Math.pow(180 / a, 1.5);
    M += n * rawDt;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;
  }

  const pos = planetPosition(M, a, e);

  // Numerical velocity (px/s) via finite difference of position
  let vx = 0, vy = 0, vMag = 0;
  if (running && prevPos !== null && prevDt !== null && prevDt > 1e-4) {
    vx   = (pos.x - prevPos.x) / prevDt;
    vy   = (pos.y - prevPos.y) / prevDt;
    vMag = Math.hypot(vx, vy);
  }
  if (running) {
    prevPos = { x: pos.x, y: pos.y };
    prevDt  = rawDt;
  }

  draw(pos.x, pos.y, vx, vy, vMag);
  requestAnimationFrame(frame);
}

function draw(px, py, vx, vy, vMag) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Sun (focus) at canvas centre
  const cx = w / 2;
  const cy = h / 2;

  // Geometric centre of the ellipse is offset from the focus by (−a·e, 0)
  const centerX = cx - a * e;

  // ── Orbital physics scaling ──────────────────────────────────────────────
  // Effective GM in pixel units:  GM_eff = n²·a³  (satisfies Kepler III)
  const n_eff  = (2 * Math.PI / 6) * speed * Math.pow(180 / a, 1.5);
  const GM_eff = n_eff * n_eff * a * a * a;
  // Circular speed at semi-major axis a (reference speed for normalisation)
  const v_circ = Math.sqrt(GM_eff / a);   // px/s
  // Normalised speed  (= 1 for a circular orbit)
  const v_norm = vMag > 0 ? vMag / v_circ : 0;

  // ── Ellipse ──────────────────────────────────────────────────────────────
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

  // Perihelion / aphelion tick marks on the major axis
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 1;
  for (const tx of [cx + a * (1 - e), cx - a * (1 + e)]) {
    ctx.beginPath();
    ctx.moveTo(tx, cy - 7);
    ctx.lineTo(tx, cy + 7);
    ctx.stroke();
  }

  // ── r vector (focus → planet) ────────────────────────────────────────────
  const rLen = Math.hypot(px, py);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + px, cy + py);
  ctx.stroke();

  if (rLen > 30) {
    const nx = -py / rLen, ny = px / rLen; // outward normal
    ctx.fillStyle = '#ffd166';
    ctx.font = 'italic 14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('r', cx + px / 2 + nx * 12, cy + py / 2 + ny * 12);
  }

  // ── Velocity arrow ────────────────────────────────────────────────────────
  // Arrow length is proportional to v/v_circ so it stays bounded across all
  // slider settings.  BASE_PX=60 means a circular orbit gets a 60 px arrow.
  const BASE_PX = 60;
  const arrowLen = v_norm * BASE_PX;

  if (arrowLen > 2 && vMag > 0) {
    const arrowX = cx + px;
    const arrowY = cy + py;
    const tipX   = arrowX + (vx / vMag) * arrowLen;
    const tipY   = arrowY + (vy / vMag) * arrowLen;

    ctx.strokeStyle = '#7aa2f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#7aa2f7';
    drawArrowhead(tipX, tipY, tipX - arrowX, tipY - arrowY, 8);
  }

  // ── Sun ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fill();

  // ── Planet ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(cx + px, cy + py, 5, 0, 2 * Math.PI);
  ctx.fill();

  // ── Readout (top-left) ───────────────────────────────────────────────────
  // Energy normalised to GM_eff/a so the value is O(1):
  //   E_norm = [½v² − GM/r] / (GM/a)  = −½  everywhere on a Keplerian orbit
  const rNorm = rLen / a;
  let E_norm_str = '—';
  if (vMag > 0) {
    const KE    = 0.5 * vMag * vMag;
    const PE    = -GM_eff / rLen;
    E_norm_str  = ((KE + PE) / (GM_eff / a)).toFixed(3);
  }

  ctx.fillStyle = '#e6edf3';
  ctx.font = '14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`r  =  ${rNorm.toFixed(3)} a`, 16, 14);
  ctx.fillText(`v  =  ${v_norm.toFixed(3)} v\u2080`, 16, 32);
  ctx.fillText(`E  =  ${E_norm_str}  (expect \u22120.500)`, 16, 50);

  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(
    `v\u2080 = \u221a(GM/a) \u2502 r ranges ${(1 - e).toFixed(2)}a \u2013 ${(1 + e).toFixed(2)}a`,
    16, 70
  );
}

requestAnimationFrame(frame);
