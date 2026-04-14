import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ── DOM handles ──────────────────────────────────────────────────────────────
const canvas       = document.getElementById('moi-canvas');
const ctx          = canvas.getContext('2d');

const coreFracInput    = document.getElementById('core-frac');
const densityRatioInput = document.getElementById('density-ratio');
const rotationInput    = document.getElementById('rotation');

const coreFracVal    = document.getElementById('core-frac-val');
const densityRatioVal = document.getElementById('density-ratio-val');
const rotationVal    = document.getElementById('rotation-val');

const btnEarth   = document.getElementById('btn-earth');
const btnMoon    = document.getElementById('btn-moon');
const btnUniform = document.getElementById('btn-uniform');

// ── State ────────────────────────────────────────────────────────────────────
let x = parseFloat(coreFracInput.value);   // r_c / R  ∈ [0, 0.8]
let k = parseFloat(densityRatioInput.value); // ρ_c / ρ_m ∈ [1, 10]
let omega = parseFloat(rotationInput.value); // normalised Ω ∈ [0, 1]

// ── Physics ──────────────────────────────────────────────────────────────────
/**
 * Dimensionless moment-of-inertia factor for a two-layer sphere.
 *
 *   C/MR² = (2/5) · (1 + (k−1)·x⁵) / (1 + (k−1)·x³)
 *
 * When k = 1 (uniform):  numerator = denominator → 2/5 = 0.4  ✓
 * When k > 1, x > 0: denominator grows faster than numerator → < 0.4  ✓
 */
function computeMoI(x, k) {
  const num = 1 + (k - 1) * Math.pow(x, 5);
  const den = 1 + (k - 1) * Math.pow(x, 3);
  return (2 / 5) * (num / den);
}

/**
 * Approximate flattening for a fluid body.
 * We use f ≈ (1/2) · (a³ω²)/(GM) in normalised units.
 * Here omega ∈ [0,1] is mapped so Ω=1 → f_max = 0.20.
 */
function computeFlattening(omega) {
  return 0.20 * omega * omega; // quadratic so small Ω gives tiny f
}

// ── Labels ───────────────────────────────────────────────────────────────────
function syncLabels() {
  coreFracVal.textContent    = x.toFixed(2);
  densityRatioVal.textContent = k.toFixed(1);
  rotationVal.textContent    = omega.toFixed(2);
}

// ── Input listeners ──────────────────────────────────────────────────────────
coreFracInput.addEventListener('input', () => {
  x = parseFloat(coreFracInput.value);
  syncLabels();
  draw();
});
densityRatioInput.addEventListener('input', () => {
  k = parseFloat(densityRatioInput.value);
  syncLabels();
  draw();
});
rotationInput.addEventListener('input', () => {
  omega = parseFloat(rotationInput.value);
  syncLabels();
  draw();
});

// ── Preset buttons ───────────────────────────────────────────────────────────
function applyPreset(nx, nk, nomega) {
  x = nx; k = nk; omega = nomega;
  coreFracInput.value    = x;
  densityRatioInput.value = k;
  rotationInput.value    = omega;
  syncLabels();
  draw();
}

btnEarth.addEventListener('click',   () => applyPreset(0.55, 3.5, 0));
btnMoon.addEventListener('click',    () => applyPreset(0.20, 1.8, 0));
btnUniform.addEventListener('click', () => applyPreset(0.00, 1.0, 0));

syncLabels();

// ── Drawing ──────────────────────────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const moi = computeMoI(x, k);
  const f   = computeFlattening(omega);

  drawLeftPanel(W, H, x, k, f);
  drawRightPanel(W, H, moi, f);
  drawDivider(W, H);
}

// ─── Left panel: layered cross-section ───────────────────────────────────────
function drawLeftPanel(W, H, x, k, f) {
  const cx = W / 4;          // centre of the cross-section
  const cy = H / 2;
  const R  = Math.min(W / 4 - 20, H / 2 - 30); // outer radius in px

  // Apply flattening: equatorial (a) > polar (c)
  // semi-axes: a = R, c = R*(1 - f)  — we animate with f
  const Ra = R;               // equatorial semi-axis
  const Rc = R * (1 - f);    // polar semi-axis

  // Outer body (mantle)
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.ellipse(cx, cy, Ra, Rc, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Thin mantle border
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Ra, Rc, 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Core (only when x > 0)
  if (x > 0.005) {
    const rc_a = Ra * x;
    const rc_c = Rc * x;
    ctx.fillStyle = '#f7768e';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rc_a, rc_c, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rc_a, rc_c, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Labels
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Mantle label (right of centre, in blue region)
  const mantleLabelX = cx + Ra * 0.55;
  const mantleLabelY = cy - Rc * 0.40;
  if (x < 0.7) {
    ctx.fillStyle = '#e6edf3';
    ctx.fillText('mantle', mantleLabelX, mantleLabelY);
  }

  // Core label (centred in core)
  if (x > 0.15) {
    ctx.fillStyle = '#e6edf3';
    ctx.textAlign = 'center';
    ctx.fillText('core', cx, cy);
  }

  // R arrow: centre → equatorial edge
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Ra, cy);
  ctx.stroke();
  // arrowhead
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(cx + Ra,     cy);
  ctx.lineTo(cx + Ra - 8, cy - 4);
  ctx.lineTo(cx + Ra - 8, cy + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffd166';
  ctx.font = 'italic 15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('R', cx + Ra / 2, cy - 5);

  // Panel title
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Cross-section (equatorial plane)', cx, 10);

  // Legend
  const legX = 12;
  let   legY = H - 62;
  const sw = 14, sh = 10, gap = 6;

  ctx.fillStyle = '#7aa2f7';
  ctx.fillRect(legX, legY, sw, sh);
  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('mantle (ρ_m)', legX + sw + gap, legY + sh / 2);

  legY += sh + 6;
  ctx.fillStyle = '#f7768e';
  ctx.fillRect(legX, legY, sw, sh);
  ctx.fillStyle = '#e6edf3';
  ctx.fillText('core (k · ρ_m)', legX + sw + gap, legY + sh / 2);
}

// ─── Right panel: numeric readout + bulge ────────────────────────────────────
function drawRightPanel(W, H, moi, f) {
  const panelX = W / 2 + 20;

  // ── C/MR² readout ──
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 18px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Moment-of-inertia factor', panelX, 20);

  // Big value
  const moiColor = moi < 0.38 ? '#f7768e' : moi > 0.399 ? '#9ece6a' : '#7aa2f7';
  ctx.fillStyle = moiColor;
  ctx.font = 'bold 42px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`C/MR² = ${moi.toFixed(3)}`, panelX, 46);

  // Uniform reference line
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Uniform sphere limit: 0.400', panelX, 100);

  // Reference bar: 0.30 … 0.40
  const barX = panelX;
  const barY = 125;
  const barW = Math.min(W / 2 - 40, 340);
  const barH = 14;
  const barMin = 0.30;
  const barMax = 0.41;

  // Background gradient
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0,   '#f7768e');
  grad.addColorStop(0.5, '#7aa2f7');
  grad.addColorStop(1,   '#9ece6a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();

  // Tick marks and labels for Earth, Moon, uniform
  const refs = [
    { val: 0.3308, label: 'Earth',   color: '#ffd166' },
    { val: 0.3940, label: 'Moon',    color: '#bb9af7' },
    { val: 0.4000, label: '2/5',     color: '#9ece6a' },
  ];
  for (const ref of refs) {
    const tx = barX + ((ref.val - barMin) / (barMax - barMin)) * barW;
    ctx.strokeStyle = '#0d1117';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, barY);
    ctx.lineTo(tx, barY + barH);
    ctx.stroke();
    ctx.fillStyle = ref.color;
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(ref.label, tx, barY + barH + 3);
    ctx.fillText(ref.val.toFixed(3), tx, barY + barH + 16);
  }

  // Live marker on the bar
  const liveT = Math.max(0, Math.min(1, (moi - barMin) / (barMax - barMin)));
  const liveX = barX + liveT * barW;
  ctx.fillStyle = '#e6edf3';
  ctx.beginPath();
  ctx.moveTo(liveX, barY - 2);
  ctx.lineTo(liveX - 6, barY - 12);
  ctx.lineTo(liveX + 6, barY - 12);
  ctx.closePath();
  ctx.fill();

  // ── Mass concentration text ──
  const concentration = moi < 0.35 ? 'strong central concentration'
                       : moi < 0.39 ? 'moderate central concentration'
                       : 'near-uniform distribution';
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Mass distribution: ${concentration}`, panelX, barY + barH + 36);

  // ── Flattening readout ──
  const fReadoutY = barY + barH + 72;
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 16px -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Flattening  f = ${f.toFixed(4)}`, panelX, fReadoutY);

  const fRefs = 'Earth f ≈ 0.0034   Saturn f ≈ 0.098';
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(fRefs, panelX, fReadoutY + 22);

  // ── Bulge ellipse ──
  const bulgeLabel  = 'Equatorial shape (exaggerated)';
  const bulgeCX     = panelX + Math.min(W / 2 - 40, 340) / 2;
  const bulgeCY     = fReadoutY + 130;
  const bulgeRbase  = 70;
  const bulgeRa     = bulgeRbase * (1 + f * 3);   // exaggerated × 3
  const bulgeRc     = bulgeRbase * (1 - f * 3);

  // Shadow / glow
  ctx.shadowColor = '#7aa2f7';
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = '#7aa2f7';
  ctx.beginPath();
  ctx.ellipse(bulgeCX, bulgeCY, bulgeRa, bulgeRc, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur  = 0;

  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.ellipse(bulgeCX, bulgeCY, bulgeRa, bulgeRc, 0, 0, 2 * Math.PI);
  ctx.stroke();

  // a/c axis markers
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(bulgeCX - bulgeRa, bulgeCY);
  ctx.lineTo(bulgeCX + bulgeRa, bulgeCY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bulgeCX, bulgeCY - bulgeRc);
  ctx.lineTo(bulgeCX, bulgeCY + bulgeRc);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#8b949e';
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(bulgeLabel, bulgeCX, bulgeCY + bulgeRc + 8);
}

// ─── Dividing line between panels ────────────────────────────────────────────
function drawDivider(W, H) {
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, 10);
  ctx.lineTo(W / 2, H - 10);
  ctx.stroke();
}

// ── Initial render ───────────────────────────────────────────────────────────
draw();

// ─────────────────────────────────────────────────────────────────────────────
// Second canvas: visualizing the quadrupole correction in MacCullagh's formula
// ─────────────────────────────────────────────────────────────────────────────
const quadCanvas = document.getElementById('quadrupole-canvas');
const quadCtx    = quadCanvas.getContext('2d');
const quadFInput = document.getElementById('quad-f');
const quadFVal   = document.getElementById('quad-f-val');

let qf = parseFloat(quadFInput.value);

quadFInput.addEventListener('input', () => {
  qf = parseFloat(quadFInput.value);
  quadFVal.textContent = qf.toFixed(3);
  drawQuad();
});

/**
 * MacCullagh gravitational acceleration at distance r and latitude φ
 * (radians from equator), in normalized units where GM=1, a=1.
 *
 *   g(r, φ) = GM/r² − (3·G·(C−A) / (2 r⁴)) · (3 sin²φ − 1)
 *
 * For a uniform-density oblate spheroid with equatorial radius a, polar c:
 *   C − A = (1/5) M (a² − c²)
 * Setting M=1, a=1 and c = 1−f:
 *   (C − A) = (1 − (1−f)²) / 5  =  (2f − f²) / 5
 */
function macCullagh(r, phi, f) {
  const CmA = (2*f - f*f) / 5;     // (C − A)/M  in units where a=1
  const monopole = 1 / (r*r);
  const quad = -(3 * CmA) / (2 * Math.pow(r, 4)) * (3 * Math.sin(phi)**2 - 1);
  return monopole + quad;
}

function drawQuad() {
  const W = quadCanvas.width;
  const H = quadCanvas.height;
  quadCtx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const aPx = 90;                 // equatorial radius in pixels (a = 1 in our units)
  const cPx = aPx * (1 - qf);     // polar radius
  const ringR = aPx * 1.6;        // test-particle ring (outside the body)

  // Body fill
  quadCtx.fillStyle = '#7aa2f7';
  quadCtx.beginPath();
  quadCtx.ellipse(cx, cy, aPx, cPx, 0, 0, 2 * Math.PI);
  quadCtx.fill();
  quadCtx.strokeStyle = '#30363d';
  quadCtx.lineWidth = 1.5;
  quadCtx.beginPath();
  quadCtx.ellipse(cx, cy, aPx, cPx, 0, 0, 2 * Math.PI);
  quadCtx.stroke();

  // Test-ring outline (faint)
  quadCtx.strokeStyle = '#30363d';
  quadCtx.lineWidth = 1;
  quadCtx.setLineDash([3, 4]);
  quadCtx.beginPath();
  quadCtx.arc(cx, cy, ringR, 0, 2 * Math.PI);
  quadCtx.stroke();
  quadCtx.setLineDash([]);

  // Compute gravity at every angle around the ring; remember min/max for color
  const N = 24;
  const samples = [];
  let minG = Infinity, maxG = -Infinity;
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * 2 * Math.PI;          // angle from +x in screen coords
    const phi   = Math.PI/2 - theta;              // latitude (radians) — pole at theta=π/2 and 3π/2
    // We measure r in normalized units (a = 1), so r/a = ringR/aPx = 1.6
    const r_norm = ringR / aPx;
    const g = macCullagh(r_norm, Math.abs(Math.PI/2 - Math.abs(theta - Math.PI/2)), qf);
    // Easier: latitude is angle above the equator. Equator on canvas is at theta=0 or π (horizontal).
    // Pole is at theta=π/2 or 3π/2 (vertical). So latitude = arcsin(|sin(theta)|).
    const lat = Math.asin(Math.abs(Math.sin(theta)));
    const gPhys = macCullagh(r_norm, lat, qf);
    samples.push({ theta, gPhys });
    if (gPhys < minG) minG = gPhys;
    if (gPhys > maxG) maxG = gPhys;
  }

  // Draw arrows
  const baseLen = 60;  // px when g = 1 (monopole baseline)
  for (const s of samples) {
    const px = cx + ringR * Math.cos(s.theta);
    const py = cy + ringR * Math.sin(s.theta);
    const len = baseLen * s.gPhys;
    // arrow points INWARD (toward center)
    const dx = (cx - px) / ringR;
    const dy = (cy - py) / ringR;
    const ex = px + dx * len;
    const ey = py + dy * len;

    // color: stronger than monopole = brighter, weaker = dimmer
    const t = (s.gPhys - 1) * 30;     // amplify deviation
    const tClamped = Math.max(-1, Math.min(1, t));
    let color;
    if (tClamped >= 0) {
      // green-ish for stronger
      const v = Math.round(150 + 105 * tClamped);
      color = `rgb(${255 - 50 * tClamped}, ${v}, 100)`;
    } else {
      // red-ish for weaker
      const v = Math.round(150 + 105 * (-tClamped));
      color = `rgb(${v + 50}, ${100}, ${100})`;
    }

    quadCtx.strokeStyle = color;
    quadCtx.lineWidth = 2.5;
    quadCtx.beginPath();
    quadCtx.moveTo(px, py);
    quadCtx.lineTo(ex, ey);
    quadCtx.stroke();

    // arrowhead
    const headSize = 6;
    const ang = Math.atan2(dy, dx);
    quadCtx.fillStyle = color;
    quadCtx.beginPath();
    quadCtx.moveTo(ex, ey);
    quadCtx.lineTo(ex - headSize * Math.cos(ang - 0.4), ey - headSize * Math.sin(ang - 0.4));
    quadCtx.lineTo(ex - headSize * Math.cos(ang + 0.4), ey - headSize * Math.sin(ang + 0.4));
    quadCtx.closePath();
    quadCtx.fill();
  }

  // Mass-element dots inside the body — illustrate where mass lives
  const dotCount = 60;
  quadCtx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < dotCount; i++) {
    // Sample uniformly inside the ellipse
    let dx, dy;
    do {
      dx = (Math.random() * 2 - 1);
      dy = (Math.random() * 2 - 1);
    } while (dx * dx + dy * dy > 1);
    quadCtx.beginPath();
    quadCtx.arc(cx + dx * aPx, cy + dy * cPx, 1.4, 0, 2 * Math.PI);
    quadCtx.fill();
  }

  // Axis labels
  quadCtx.fillStyle = '#8b949e';
  quadCtx.font = '12px -apple-system, Segoe UI, sans-serif';
  quadCtx.textAlign = 'center';
  quadCtx.textBaseline = 'bottom';
  quadCtx.fillText('N pole (φ = 90°)', cx, cy - ringR - 14);
  quadCtx.textBaseline = 'top';
  quadCtx.fillText('S pole (φ = −90°)', cx, cy + ringR + 6);
  quadCtx.textAlign = 'right';
  quadCtx.textBaseline = 'middle';
  quadCtx.fillText('equator (φ = 0)', cx - ringR - 8, cy);
  quadCtx.textAlign = 'left';
  quadCtx.fillText('equator', cx + ringR + 8, cy);

  // Numeric readout
  const J2 = (2*qf - qf*qf) / 5;     // J₂ in units a=1, M=1
  const r_norm = ringR / aPx;
  const gPole = macCullagh(r_norm, Math.PI / 2, qf);
  const gEq   = macCullagh(r_norm, 0, qf);
  const monopole = 1 / (r_norm * r_norm);

  quadCtx.fillStyle = '#e6edf3';
  quadCtx.font = '13px -apple-system, Segoe UI, sans-serif';
  quadCtx.textAlign = 'left';
  quadCtx.textBaseline = 'top';
  quadCtx.fillText(`f = ${qf.toFixed(3)}`, 14, 14);
  quadCtx.fillText(`J₂ = (C−A)/(Ma²) = ${J2.toFixed(4)}`, 14, 32);
  quadCtx.fillText(`g_monopole = GM/r² = ${monopole.toFixed(4)}`, 14, 56);
  quadCtx.fillStyle = '#9ece6a';
  quadCtx.fillText(`g_equator = ${gEq.toFixed(4)}   (+${((gEq/monopole - 1)*100).toFixed(2)}%)`, 14, 74);
  quadCtx.fillStyle = '#f7768e';
  quadCtx.fillText(`g_pole    = ${gPole.toFixed(4)}   (${((gPole/monopole - 1)*100).toFixed(2)}%)`, 14, 92);

  quadCtx.fillStyle = '#8b949e';
  quadCtx.fillText('All arrows measured at the same distance r = 1.6 a from center.', 14, H - 22);
}

drawQuad();

// ─────────────────────────────────────────────────────────────────────────────
// Third canvas: monopole / dipole / quadrupole zoo
// Top row = electric (with ± charges), bottom row = gravity (mass only)
// ─────────────────────────────────────────────────────────────────────────────
const multiCanvas = document.getElementById('multipole-canvas');
const multiCtx    = multiCanvas.getContext('2d');

function drawCharge(cx, cy, sign, radius = 12) {
  multiCtx.fillStyle = sign > 0 ? '#f7768e' : '#7aa2f7';
  multiCtx.beginPath();
  multiCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
  multiCtx.fill();
  multiCtx.strokeStyle = '#0d1117';
  multiCtx.lineWidth = 1.5;
  multiCtx.stroke();
  multiCtx.fillStyle = '#0d1117';
  multiCtx.font = 'bold 16px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'middle';
  multiCtx.fillText(sign > 0 ? '+' : '−', cx, cy + 1);
}

function drawMassDot(cx, cy, radius = 12) {
  multiCtx.fillStyle = '#ffd166';
  multiCtx.beginPath();
  multiCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
  multiCtx.fill();
  multiCtx.strokeStyle = '#0d1117';
  multiCtx.lineWidth = 1.5;
  multiCtx.stroke();
  multiCtx.fillStyle = '#0d1117';
  multiCtx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'middle';
  multiCtx.fillText('M', cx, cy + 1);
}

function multiArrow(x1, y1, x2, y2, color, width = 1.5) {
  multiCtx.strokeStyle = color;
  multiCtx.fillStyle   = color;
  multiCtx.lineWidth   = width;
  multiCtx.beginPath();
  multiCtx.moveTo(x1, y1);
  multiCtx.lineTo(x2, y2);
  multiCtx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = 5;
  multiCtx.beginPath();
  multiCtx.moveTo(x2, y2);
  multiCtx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
  multiCtx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
  multiCtx.closePath();
  multiCtx.fill();
}

function drawElectricMonopole(cx, cy, R) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    multiArrow(cx + 18 * Math.cos(a), cy + 18 * Math.sin(a),
               cx + R * 0.85 * Math.cos(a), cy + R * 0.85 * Math.sin(a),
               '#bb9af7');
  }
  drawCharge(cx, cy, +1, 14);
}

function drawElectricDipole(cx, cy, R) {
  const sep = 30;
  multiCtx.strokeStyle = '#bb9af7';
  multiCtx.lineWidth = 1.5;
  const angles = [-1.0, -0.5, 0.5, 1.0];
  for (const baseA of angles) {
    multiCtx.beginPath();
    const x0 = cx - sep + 14 * Math.cos(baseA);
    const y0 = cy + 14 * Math.sin(baseA);
    const yOff = 60 * Math.sign(baseA) * (1 - Math.abs(baseA) * 0.4);
    const cp1x = cx - sep / 2;
    const cp1y = cy + yOff;
    const cp2x = cx + sep / 2;
    const cp2y = cy + yOff;
    const x1 = cx + sep - 14 * Math.cos(baseA);
    const y1 = cy + 14 * Math.sin(baseA);
    multiCtx.moveTo(x0, y0);
    multiCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1);
    multiCtx.stroke();
  }
  multiArrow(cx - sep + 14, cy, cx + sep - 14, cy, '#bb9af7');
  drawCharge(cx - sep, cy, +1, 13);
  drawCharge(cx + sep, cy, -1, 13);
}

function drawElectricQuadrupole(cx, cy, R) {
  const s = 30;
  drawCharge(cx - s, cy - s, +1, 11);
  drawCharge(cx + s, cy - s, -1, 11);
  drawCharge(cx - s, cy + s, -1, 11);
  drawCharge(cx + s, cy + s, +1, 11);
  const lobeR = R * 0.85;
  multiArrow(cx + 12, cy - 12, cx + lobeR * 0.7, cy - lobeR * 0.7, '#bb9af7');
  multiArrow(cx - 12, cy + 12, cx - lobeR * 0.7, cy + lobeR * 0.7, '#bb9af7');
  multiArrow(cx + 12, cy + 12, cx + lobeR * 0.7, cy + lobeR * 0.7, '#bb9af7');
  multiArrow(cx - 12, cy - 12, cx - lobeR * 0.7, cy - lobeR * 0.7, '#bb9af7');
}

function drawGravityMonopole(cx, cy, R) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    multiArrow(cx + R * 0.85 * Math.cos(a), cy + R * 0.85 * Math.sin(a),
               cx + 22 * Math.cos(a), cy + 22 * Math.sin(a),
               '#9ece6a');
  }
  drawMassDot(cx, cy, 16);
  multiCtx.fillStyle = '#9ece6a';
  multiCtx.font = '11px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'top';
  multiCtx.fillText('every body has one', cx, cy + R - 6);
}

function drawGravityDipole(cx, cy, R) {
  drawMassDot(cx - 30, cy, 14);
  multiCtx.strokeStyle = '#f7768e';
  multiCtx.lineWidth = 2;
  multiCtx.setLineDash([5, 4]);
  multiCtx.beginPath();
  multiCtx.arc(cx + 30, cy, 14, 0, 2 * Math.PI);
  multiCtx.stroke();
  multiCtx.setLineDash([]);
  multiCtx.fillStyle = '#f7768e';
  multiCtx.font = 'bold 12px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'middle';
  multiCtx.fillText('−M', cx + 30, cy + 1);
  multiCtx.font = '10px -apple-system, Segoe UI, sans-serif';
  multiCtx.fillText('(impossible)', cx + 30, cy + 24);

  multiCtx.fillStyle = '#e6edf3';
  multiCtx.font = 'bold 36px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'middle';
  multiCtx.fillText('= 0', cx, cy - 60);
  multiCtx.fillStyle = '#8b949e';
  multiCtx.font = '11px -apple-system, Segoe UI, sans-serif';
  multiCtx.fillText('(measured from CoM)', cx, cy - 32);
}

function drawGravityQuadrupole(cx, cy, R) {
  const a = R * 0.55;
  const c = R * 0.35;

  multiCtx.fillStyle = '#7aa2f7';
  multiCtx.beginPath();
  multiCtx.ellipse(cx, cy, a, c, 0, 0, 2 * Math.PI);
  multiCtx.fill();
  multiCtx.strokeStyle = '#30363d';
  multiCtx.lineWidth = 1.5;
  multiCtx.beginPath();
  multiCtx.ellipse(cx, cy, a, c, 0, 0, 2 * Math.PI);
  multiCtx.stroke();

  multiCtx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 30; i++) {
    let dx, dy;
    do {
      dx = Math.random() * 2 - 1;
      dy = Math.random() * 2 - 1;
    } while (dx*dx + dy*dy > 1);
    multiCtx.beginPath();
    multiCtx.arc(cx + dx * a, cy + dy * c, 1.2, 0, 2 * Math.PI);
    multiCtx.fill();
  }

  const ringR = R * 0.95;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * 2 * Math.PI;
    const px = cx + ringR * Math.cos(ang);
    const py = cy + ringR * Math.sin(ang);
    const lat = Math.asin(Math.abs(Math.sin(ang)));
    const f = 0.4;
    const J2 = (2*f - f*f) / 5;
    const r_norm = ringR / a;
    const monopole = 1 / (r_norm * r_norm);
    const quad = -(3 * J2) / (2 * Math.pow(r_norm, 4)) * (3 * Math.sin(lat)**2 - 1);
    const g = monopole + quad;
    const len = 32 * (g / monopole);

    const dx = (cx - px) / ringR;
    const dy = (cy - py) / ringR;
    const ex = px + dx * len;
    const ey = py + dy * len;

    const t = (g / monopole - 1) * 4;
    const tC = Math.max(-1, Math.min(1, t));
    const color = tC >= 0
      ? `rgb(${Math.round(160 - 60 * tC)}, ${Math.round(200 + 55 * tC)}, 100)`
      : `rgb(${Math.round(220 + 35 * (-tC))}, 120, 120)`;

    multiArrow(px, py, ex, ey, color, 2);
  }

  multiCtx.fillStyle = '#9ece6a';
  multiCtx.font = '11px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'top';
  multiCtx.fillText('(C − A) ≠ 0', cx, cy + R - 6);
}

function drawMultipole() {
  const W = multiCanvas.width;
  const H = multiCanvas.height;
  multiCtx.clearRect(0, 0, W, H);

  const colW = W / 3;
  const rowH = H / 2;

  drawElectricMonopole(  colW * 0.5, rowH * 0.5, 130);
  drawElectricDipole(    colW * 1.5, rowH * 0.5, 130);
  drawElectricQuadrupole(colW * 2.5, rowH * 0.5, 130);

  drawGravityMonopole(  colW * 0.5, rowH * 1.5, 130);
  drawGravityDipole(    colW * 1.5, rowH * 1.5, 130);
  drawGravityQuadrupole(colW * 2.5, rowH * 1.5, 130);

  multiCtx.fillStyle = '#e6edf3';
  multiCtx.font = 'bold 15px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'top';
  multiCtx.fillText('Monopole  (1/r²)',   colW * 0.5, 8);
  multiCtx.fillText('Dipole  (1/r³)',     colW * 1.5, 8);
  multiCtx.fillText('Quadrupole  (1/r⁴)', colW * 2.5, 8);

  multiCtx.save();
  multiCtx.translate(14, rowH * 0.5);
  multiCtx.rotate(-Math.PI / 2);
  multiCtx.fillStyle = '#8b949e';
  multiCtx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  multiCtx.textAlign = 'center';
  multiCtx.textBaseline = 'top';
  multiCtx.fillText('ELECTRIC  (± charges)', 0, 0);
  multiCtx.restore();

  multiCtx.save();
  multiCtx.translate(14, rowH * 1.5);
  multiCtx.rotate(-Math.PI / 2);
  multiCtx.fillStyle = '#8b949e';
  multiCtx.fillText('GRAVITY  (mass only)', 0, 0);
  multiCtx.restore();

  multiCtx.strokeStyle = '#30363d';
  multiCtx.lineWidth = 1;
  multiCtx.beginPath();
  multiCtx.moveTo(40, rowH);
  multiCtx.lineTo(W - 10, rowH);
  multiCtx.stroke();
}

drawMultipole();
