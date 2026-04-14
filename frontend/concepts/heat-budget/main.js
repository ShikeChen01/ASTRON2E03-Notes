import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const canvas     = document.getElementById('heat-canvas');
const ctx        = canvas.getContext('2d');
const radiusInput  = document.getElementById('radius');
const radiusVal    = document.getElementById('radius-val');
const tauReadout   = document.getElementById('tau-readout');
const statusBadge  = document.getElementById('status-badge');
const replayBtn    = document.getElementById('replay');

// ---------------------------------------------------------------------------
// Cooling timescale model
// τ(R) = 0.5 * (R/1000)^1.5  [Gyr]
// Gives: Moon(1737) ≈ 1.1, Mercury(2440) ≈ 1.9, Mars(3389) ≈ 3.1,
//        Venus(6052) ≈ 7.4, Earth(6371) ≈ 8.0  — but bar chart uses fixed
//        representative values for clarity. The formula is used for the
//        live readout and animation timing only.
// ---------------------------------------------------------------------------
const SOLAR_SYSTEM_AGE = 4.6; // Gyr

function tauGyr(R) {
  return 0.5 * Math.pow(R / 1000, 1.5);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let R         = parseFloat(radiusInput.value);   // km, current slider value
let animT     = 0;      // animation time in [0, 1]; 0=fully hot, 1=fully cold
let lastTime  = null;
let animRunning = true;
const ANIM_DURATION = 5; // seconds wall-time for a full cool-down

// Bar-chart data (fixed representative values)
const BODIES = [
  { name: 'Moon',    tau: 1.0, active: false },
  { name: 'Mercury', tau: 1.5, active: false },
  { name: 'Mars',    tau: 3.0, active: false },
  { name: 'Venus',   tau: 5.0, active: true  },
  { name: 'Earth',   tau: 5.0, active: true  },
];

// ---------------------------------------------------------------------------
// UI sync
// ---------------------------------------------------------------------------
function syncUI() {
  const tau = tauGyr(R);
  radiusVal.textContent = `${R} km`;
  tauReadout.innerHTML  = `\u03C4<sub>cool</sub> &asymp; ${tau.toFixed(1)} Gyr`;

  const isActive = tau > SOLAR_SYSTEM_AGE;
  statusBadge.textContent = isActive ? 'ACTIVE' : 'COOLED';
  statusBadge.className   = 'badge ' + (isActive ? 'active' : 'cooled');
}

radiusInput.addEventListener('input', () => {
  R = parseFloat(radiusInput.value);
  syncUI();
  resetAnimation();
});

replayBtn.addEventListener('click', resetAnimation);

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    R = parseInt(btn.dataset.r, 10);
    radiusInput.value = R;
    syncUI();
    resetAnimation();
  });
});

function resetAnimation() {
  animT = 0;
  animRunning = true;
  lastTime = null;
}

syncUI();

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

// Lerp between two hex colours by t in [0,1]
function lerpColor(hex1, hex2, t) {
  const parse = h => [
    parseInt(h.slice(1,3), 16),
    parseInt(h.slice(3,5), 16),
    parseInt(h.slice(5,7), 16),
  ];
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Temperature palette: 0 = hottest core, 1 = cold surface
function tempColor(frac) {
  if (frac < 0.5) return lerpColor('#ffd166', '#e0af68', frac * 2);
  return lerpColor('#e0af68', '#30363d', (frac - 0.5) * 2);
}

// ---------------------------------------------------------------------------
// Left panel: body cross-section
// ---------------------------------------------------------------------------
function drawBody(leftW, h, t) {
  // t in [0,1]: fraction of cooling complete
  // The "cold front" has advanced from the outside inward.
  // At t=0: entire disk is hot (#ffd166).
  // At t=1: entire disk is cold (#30363d).
  // The cool shell depth = t * radius_px.

  const cx = leftW / 2;
  const cy = h / 2;
  const bodyR = Math.min(leftW, h) * 0.38;

  // Use a radial gradient:
  // - from centre to (bodyR * (1 - t)): hot colours
  // - from (bodyR * (1 - t)) to bodyR: cold colour
  const hotFront = bodyR * Math.max(0, 1 - t); // radius of still-hot zone

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bodyR);

  if (hotFront > 1) {
    // Hot zone exists: bright core fading to warm at hotFront,
    // then abrupt transition to cool shell.
    const stopFrac = hotFront / bodyR; // normalised position of hot/cold front

    grad.addColorStop(0,             '#ffd166');          // core: bright yellow
    grad.addColorStop(stopFrac * 0.6,'#ffd166');          // still hot mid-core
    grad.addColorStop(stopFrac,      '#e0af68');          // warm transition
    grad.addColorStop(Math.min(stopFrac + 0.05, 1), '#4a3010'); // sharp cool front
    grad.addColorStop(1,             '#30363d');          // cold surface
  } else {
    // Fully cold
    grad.addColorStop(0, '#302820');
    grad.addColorStop(1, '#30363d');
  }

  ctx.beginPath();
  ctx.arc(cx, cy, bodyR, 0, 2 * Math.PI);
  ctx.fillStyle = grad;
  ctx.fill();

  // Thin border ring
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('cross-section', cx, h - 22);

  // Radius label
  ctx.fillStyle = '#7aa2f7';
  ctx.font = '14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`R = ${R} km`, cx, cy + bodyR + 22);

  // Draw a radius arrow
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + bodyR, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cool/hot labels inside if there's room
  if (hotFront > bodyR * 0.25) {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.font = 'bold 12px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('hot', cx, cy);
  }
  if (t > 0.15) {
    const shellMid = hotFront + (bodyR - hotFront) * 0.5;
    const angle = -Math.PI / 4;
    const lx = cx + shellMid * Math.cos(angle);
    const ly = cy + shellMid * Math.sin(angle);
    ctx.fillStyle = 'rgba(139, 148, 158, 0.85)';
    ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('cool', lx, ly);
  }
}

// ---------------------------------------------------------------------------
// Right panel: horizontal bar chart (log scale)
// ---------------------------------------------------------------------------
function drawBarChart(offsetX, w, h) {
  const padLeft   = 78;
  const padRight  = 20;
  const padTop    = 36;
  const padBottom = 50;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const logMin = Math.log10(0.5);
  const logMax = Math.log10(10);
  const logRange = logMax - logMin;

  function xForGyr(gyr) {
    return offsetX + padLeft + (Math.log10(gyr) - logMin) / logRange * chartW;
  }

  // Background grid lines
  const gridYears = [0.5, 1, 2, 5, 10];
  ctx.strokeStyle = 'rgba(48,54,61,0.8)';
  ctx.lineWidth = 1;
  gridYears.forEach(yr => {
    const x = xForGyr(yr);
    ctx.beginPath();
    ctx.moveTo(x, offsetX > 0 ? padTop : padTop);
    ctx.lineTo(x, padTop + chartH);
    ctx.stroke();
  });

  // Title
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Cooling timescales', offsetX + padLeft + chartW / 2, 8);

  // Axis label
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Gyr (log scale)', offsetX + padLeft + chartW / 2, h - 4);

  // X-axis ticks and labels
  gridYears.forEach(yr => {
    const x = xForGyr(yr);
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(yr.toString(), x, padTop + chartH + 6);
  });

  // Bars
  const nBodies = BODIES.length;
  const barSlot = chartH / nBodies;
  const barH    = barSlot * 0.55;

  BODIES.forEach((body, i) => {
    const y0 = padTop + i * barSlot + (barSlot - barH) / 2;
    const barW = xForGyr(body.tau) - (offsetX + padLeft);
    const color = body.active ? '#9ece6a' : '#8b949e';

    // Bar
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(offsetX + padLeft, y0, barW, barH);
    ctx.globalAlpha = 1.0;

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX + padLeft, y0, barW, barH);

    // Body name label (left of axis)
    ctx.fillStyle = '#e6edf3';
    ctx.font = '13px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(body.name, offsetX + padLeft - 6, y0 + barH / 2);

    // Value label (right of bar)
    ctx.fillStyle = color;
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${body.tau} Gyr`, offsetX + padLeft + barW + 4, y0 + barH / 2);
  });

  // Current age vertical line at 4.6 Gyr
  const ageX = xForGyr(SOLAR_SYSTEM_AGE);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(ageX, padTop);
  ctx.lineTo(ageX, padTop + chartH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Age label
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('now', ageX, padTop - 2);
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------
function drawDivider(x, h) {
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, 10);
  ctx.lineTo(x, h - 10);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main frame loop
// ---------------------------------------------------------------------------
function frame(now) {
  const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (animRunning) {
    animT += dt / ANIM_DURATION;
    if (animT >= 1) {
      animT = 1;
      animRunning = false;
    }
  }

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const leftW  = 500;
  const rightX = leftW + 10;
  const rightW = W - rightX;

  drawBody(leftW, H, animT);
  drawDivider(leftW + 5, H);
  drawBarChart(rightX, rightW, H);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
