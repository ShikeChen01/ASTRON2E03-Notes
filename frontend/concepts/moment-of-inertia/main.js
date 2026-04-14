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
