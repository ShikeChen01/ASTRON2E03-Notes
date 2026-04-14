import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('lapse-canvas');
const ctx         = canvas.getContext('2d');

const tSurfInput  = document.getElementById('t-surf');
const gravInput   = document.getElementById('gravity');
const cpInput     = document.getElementById('cp');
const gEnvInput   = document.getElementById('gamma-env');
const gMoistInput = document.getElementById('gamma-moist');

const tSurfVal    = document.getElementById('t-surf-val');
const gravVal     = document.getElementById('gravity-val');
const cpVal       = document.getElementById('cp-val');
const gEnvVal     = document.getElementById('gamma-env-val');
const gMoistVal   = document.getElementById('gamma-moist-val');

// ── State ─────────────────────────────────────────────────────────────────────
let Ts      = parseFloat(tSurfInput.value);   // K
let g       = parseFloat(gravInput.value);    // m/s²
let cp      = parseFloat(cpInput.value);      // J/(kg·K)
let gammaEnv   = parseFloat(gEnvInput.value);    // K/km
let gammaMoist = parseFloat(gMoistInput.value);  // K/km

// ── Helpers ───────────────────────────────────────────────────────────────────
function gammaDry() {
  // g/cp in SI → convert to K/km
  return (g / cp) * 1000;  // K/km
}

function syncLabels() {
  tSurfVal.textContent  = Ts.toFixed(0);
  gravVal.textContent   = g.toFixed(2);
  cpVal.textContent     = cp.toFixed(0);
  gEnvVal.textContent   = gammaEnv.toFixed(1);
  gMoistVal.textContent = gammaMoist.toFixed(1);
}

// ── Preset buttons ────────────────────────────────────────────────────────────
function setPreset(ts, grav, cpVal_) {
  Ts = ts; g = grav; cp = cpVal_;
  tSurfInput.value  = ts;
  gravInput.value   = grav;
  cpInput.value     = cpVal_;
  syncLabels();
  draw();
}

document.getElementById('btn-earth').addEventListener('click',
  () => setPreset(288, 9.81, 1005));
document.getElementById('btn-jupiter').addEventListener('click',
  () => setPreset(165, 23, 14300));
document.getElementById('btn-mars').addEventListener('click',
  () => setPreset(210, 3.71, 736));
document.getElementById('btn-venus').addEventListener('click',
  () => setPreset(735, 8.87, 850));

// ── Slider listeners ──────────────────────────────────────────────────────────
tSurfInput.addEventListener('input',  () => { Ts = parseFloat(tSurfInput.value);   syncLabels(); draw(); });
gravInput.addEventListener('input',   () => { g  = parseFloat(gravInput.value);    syncLabels(); draw(); });
cpInput.addEventListener('input',     () => { cp = parseFloat(cpInput.value);      syncLabels(); draw(); });
gEnvInput.addEventListener('input',   () => { gammaEnv   = parseFloat(gEnvInput.value);   syncLabels(); draw(); });
gMoistInput.addEventListener('input', () => { gammaMoist = parseFloat(gMoistInput.value); syncLabels(); draw(); });

syncLabels();

// ── Drawing ───────────────────────────────────────────────────────────────────
const Z_MAX  = 20;   // km
const FONT   = '-apple-system, Segoe UI, sans-serif';

function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const gd = gammaDry();   // K/km

  // ── Layout ────────────────────────────────────────────────────────────────
  const PAD_L = 72, PAD_R = 220, PAD_T = 28, PAD_B = 44;
  const gx = PAD_L;            // plot left edge (x)
  const gy = PAD_T;            // plot top edge (y)
  const gw = W - PAD_L - PAD_R;
  const gh = H - PAD_T - PAD_B;

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // ── Temperature range to display ─────────────────────────────────────────
  // Ensure all three lines are visible; extend range by 20 K either side.
  const T_at20_dry   = Ts - gd * Z_MAX;
  const T_at20_moist = Ts - gammaMoist * Z_MAX;
  const T_at20_env   = Ts - gammaEnv * Z_MAX;
  const T_min = Math.min(T_at20_dry, T_at20_moist, T_at20_env) - 20;
  const T_max = Ts + 20;
  const T_range = T_max - T_min;

  // Map helpers
  function xOfT(T) {
    return gx + ((T - T_min) / T_range) * gw;
  }
  function yOfZ(z) {
    return gy + gh - (z / Z_MAX) * gh;
  }

  // ── Stability shading ─────────────────────────────────────────────────────
  // shade the region between the env profile and the dry adiabat
  const isUnstable = gammaEnv > gd;
  const shadeColor = isUnstable
    ? 'rgba(247, 118, 142, 0.12)'
    : 'rgba(158, 206, 106, 0.12)';

  ctx.beginPath();
  // top-left corner along dry adiabat path
  ctx.moveTo(xOfT(Ts),                gy + gh);           // z=0, dry
  ctx.lineTo(xOfT(Ts - gd * Z_MAX),  gy);                // z=20, dry
  // top-right along env path (reversed)
  ctx.lineTo(xOfT(Ts - gammaEnv * Z_MAX), gy);           // z=20, env
  ctx.lineTo(xOfT(Ts),                gy + gh);           // z=0, env (same as dry start)
  ctx.closePath();
  ctx.fillStyle = shadeColor;
  ctx.fill();

  // ── Plot area background ──────────────────────────────────────────────────
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, gw, gh);

  // Subtle grid
  ctx.strokeStyle = 'rgba(48,54,61,0.8)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 4]);
  // horizontal (altitude) grid lines every 5 km
  for (let z = 0; z <= Z_MAX; z += 5) {
    const y = yOfZ(z);
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + gw, y);
    ctx.stroke();
  }
  // vertical (temperature) grid lines ~ every 40 K
  const tStep = T_range > 200 ? 100 : T_range > 80 ? 40 : 20;
  const tStart = Math.ceil(T_min / tStep) * tStep;
  for (let t = tStart; t <= T_max; t += tStep) {
    const x = xOfT(t);
    if (x < gx || x > gx + gw) continue;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + gh);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── Axes ──────────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Y-axis ticks and labels (altitude, km)
  ctx.fillStyle = '#8b949e';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let z = 0; z <= Z_MAX; z += 5) {
    const y = yOfZ(z);
    ctx.fillText(`${z}`, gx - 6, y);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(gx - 4, y);
    ctx.lineTo(gx, y);
    ctx.stroke();
  }

  // X-axis ticks and labels (temperature, K)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = tStart; t <= T_max; t += tStep) {
    const x = xOfT(t);
    if (x < gx || x > gx + gw) continue;
    ctx.fillStyle = '#8b949e';
    ctx.fillText(`${t}`, x, gy + gh + 6);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, gy + gh);
    ctx.lineTo(x, gy + gh + 4);
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#8b949e';
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Temperature (K)', gx + gw / 2, gy + gh + 24);

  ctx.save();
  ctx.translate(gx - 52, gy + gh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Altitude (km)', 0, 0);
  ctx.restore();

  // ── Draw lines ────────────────────────────────────────────────────────────
  function drawLine(gamma, color, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(xOfT(Ts),                    yOfZ(0));
    ctx.lineTo(xOfT(Ts - gamma * Z_MAX),    yOfZ(Z_MAX));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Moist adiabat (blue)
  drawLine(gammaMoist, '#7aa2f7');
  // Dry adiabat (red)
  drawLine(gd, '#f7768e');
  // Environmental profile (green dashed)
  drawLine(gammaEnv, '#9ece6a', [6, 4]);

  // Line end labels
  function labelLine(gamma, color, label, align) {
    const x = xOfT(Ts - gamma * Z_MAX);
    const y = yOfZ(Z_MAX);
    ctx.fillStyle = color;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + (align === 'right' ? -6 : 6), y - 10);
  }
  labelLine(gd,        '#f7768e', 'Dry adiabat');
  labelLine(gammaMoist,'#7aa2f7', 'Moist adiabat',
    xOfT(Ts - gammaMoist * Z_MAX) > xOfT(Ts - gd * Z_MAX) ? 'left' : 'right');
  labelLine(gammaEnv,  '#9ece6a', 'Environment',
    xOfT(Ts - gammaEnv * Z_MAX) > xOfT(Ts - gd * Z_MAX) ? 'left' : 'right');

  // ── Stability verdict on plot ─────────────────────────────────────────────
  const midZ   = Z_MAX / 2;
  const midTenv = Ts - gammaEnv   * midZ;
  const midTdry = Ts - gd          * midZ;
  const midX   = (xOfT(midTenv) + xOfT(midTdry)) / 2;
  const midY   = yOfZ(midZ);

  const verdictText  = isUnstable ? 'UNSTABLE' : 'STABLE';
  const verdictColor = isUnstable ? '#f7768e'  : '#9ece6a';

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle   = verdictColor;
  ctx.font        = `bold 20px ${FONT}`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  // Clamp so it stays inside the plot
  const vx = Math.max(gx + 60, Math.min(gx + gw - 60, midX));
  ctx.fillText(verdictText, vx, midY);
  ctx.restore();

  // ── Right panel: live readout ─────────────────────────────────────────────
  const rx = gx + gw + 16;
  const ry = gy;
  const rw = PAD_R - 24;

  ctx.fillStyle = '#161b22';
  roundRect(ctx, rx, ry, rw, gh);
  ctx.fill();

  const lineH = 26;
  const x0    = rx + 14;
  let   y0    = ry + 18;

  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Γ_d
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('Dry adiabat:', x0, y0);
  y0 += lineH - 4;
  ctx.fillStyle = '#f7768e';
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(`\u0393\u1D48 = ${gd.toFixed(2)} K/km`, x0, y0);
  y0 += lineH + 4;

  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('g / c\u209A:', x0, y0);
  y0 += lineH - 4;
  ctx.fillStyle = '#8b949e';
  ctx.fillText(`${g.toFixed(2)} / ${cp.toFixed(0)}`, x0, y0);
  y0 += lineH + 8;

  // Γ_env
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('Environment:', x0, y0);
  y0 += lineH - 4;
  ctx.fillStyle = '#9ece6a';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`\u0393\u2091\u2099\u1D65 = ${gammaEnv.toFixed(1)} K/km`, x0, y0);
  y0 += lineH + 8;

  // Γ_moist
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('Moist adiabat:', x0, y0);
  y0 += lineH - 4;
  ctx.fillStyle = '#7aa2f7';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`\u0393\u2098 = ${gammaMoist.toFixed(1)} K/km`, x0, y0);
  y0 += lineH + 12;

  // Divider
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx + 10, y0);
  ctx.lineTo(rx + rw - 10, y0);
  ctx.stroke();
  y0 += 14;

  // Stability verdict
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillStyle = verdictColor;
  ctx.textAlign = 'left';
  const line1 = isUnstable ? 'UNSTABLE' : 'STABLE';
  const line2 = isUnstable ? '(convective)' : `(\u0393\u2091\u2099\u1D65 < \u0393\u1D48)`;
  ctx.fillText(line1, x0, y0);
  y0 += lineH;
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#8b949e';
  ctx.fillText(line2, x0, y0);
  y0 += lineH + 10;

  // Surface T label
  ctx.fillStyle = '#8b949e';
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`T\u209B = ${Ts.toFixed(0)} K`, x0, y0);
}

// ── Rounded rect path helper (no stroke/fill — caller does that) ──────────────
function roundRect(ctx, x, y, w, h, r = 8) {
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

// ── Initial draw ──────────────────────────────────────────────────────────────
draw();
