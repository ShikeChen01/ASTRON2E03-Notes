import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas        = document.getElementById('lagrange');
const ctx           = canvas.getContext('2d');
const massRatioInput = document.getElementById('massRatio');
const ratioVal      = document.getElementById('ratio-val');
const stabilityOut  = document.getElementById('stability-readout');
const presetBtns    = document.querySelectorAll('.presets button');

// ── Physics constants ─────────────────────────────────────────────────────────
const STABILITY_THRESHOLD = 0.0385; // Routh's criterion

// ── Canvas layout ─────────────────────────────────────────────────────────────
const W = canvas.width;   // 800
const H = canvas.height;  // 600
const CX = W / 2;
const CY = H / 2;
const R  = 240;            // separation in px (fits equilateral triangles nicely)

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR_M1       = '#ffd166'; // yellow — Sun-like
const COLOR_M2       = '#7aa2f7'; // blue — Earth-like
const COLOR_UNSTABLE = '#f7768e'; // red/pink — L1, L2, L3 (always), L4/L5 when μ₂ > threshold
const COLOR_STABLE   = '#9ece6a'; // green — L4, L5 when μ₂ < threshold
const COLOR_DASHED   = '#30363d';
const COLOR_TEXT     = '#e6edf3';
const COLOR_MUTED    = '#8b949e';

// ── State ─────────────────────────────────────────────────────────────────────
// massRatio is m2/m1; μ₂ = m2/(m1+m2) = massRatio/(1+massRatio)
let massRatio = parseFloat(massRatioInput.value); // m2/m1

function mu2FromRatio(r) { return r / (1 + r); }

// ── Geometry helpers ──────────────────────────────────────────────────────────
/**
 * Given μ₂ = m2/(m1+m2):
 *   M1 sits at x = -μ₂ * R from CoM
 *   M2 sits at x = (1 - μ₂) * R from CoM
 * (CoM is at canvas center CX, CY)
 */
function bodyPositions(mu) {
  const x1 = CX - mu * R;          // M1 (heavier body)
  const x2 = CX + (1 - mu) * R;    // M2 (lighter body)
  return { x1, x2, y1: CY, y2: CY };
}

/**
 * Collinear Lagrange points (approximate, valid for small μ₂).
 * All x-coordinates are in canvas pixels, y = CY.
 *
 * In the standard normalisation where M1 is at −μ₂ and M2 is at (1−μ₂)
 * in units of R:
 *   L1: (1 − μ₂) − (μ₂/3)^(1/3)   from CoM  → x₁ direction
 *   L2: (1 − μ₂) + (μ₂/3)^(1/3)
 *   L3: −1 − 5μ₂/12                (note: uses the approximation r_L3 ≈ −R(1 + 5μ₂/12) from M1-side)
 */
function lagrangePositions(mu) {
  const hill = Math.pow(mu / 3, 1 / 3);

  // Distance from CoM (in units of R), positive = M2 side
  const dL1 = (1 - mu) - hill;    // slightly inside M2
  const dL2 = (1 - mu) + hill;    // slightly outside M2
  const dL3 = -(1 + 5 * mu / 12); // opposite side from M2

  // Convert to canvas px
  const xL1 = CX + dL1 * R;
  const xL2 = CX + dL2 * R;
  const xL3 = CX + dL3 * R;

  // L4 leads M2 by 60°: equilateral triangle above the M1–M2 segment
  // L4/L5 are at the apex of equilateral triangles formed with M1 and M2.
  // With M1 at (CX - mu*R, CY) and M2 at (CX + (1-mu)*R, CY), the midpoint
  // of M1M2 is at (CX + (0.5 - mu)*R, CY) and the height is (√3/2)*R.
  const midX = CX + (0.5 - mu) * R;
  const height = (Math.sqrt(3) / 2) * R;
  const xL45 = midX;
  const yL4  = CY - height; // leads (above in canvas)
  const yL5  = CY + height; // trails (below in canvas)

  return {
    L1: { x: xL1, y: CY },
    L2: { x: xL2, y: CY },
    L3: { x: xL3, y: CY },
    L4: { x: xL45, y: yL4 },
    L5: { x: xL45, y: yL5 },
  };
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawDashedLine(x1, y1, x2, y2) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = COLOR_DASHED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBody(x, y, radius, color, label, labelOffsetX, labelOffsetY) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = COLOR_TEXT;
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + labelOffsetX, y + labelOffsetY);
}

function drawLagrangePoint(x, y, color, label, labelOffsetX, labelOffsetY) {
  // Filled circle marker
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Outer ring for visibility
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Label
  ctx.fillStyle = color;
  ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + labelOffsetX, y + labelOffsetY);
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const mu = mu2FromRatio(massRatio);
  const { x1, x2, y1, y2 } = bodyPositions(mu);
  const L = lagrangePositions(mu);

  const l45color = mu < STABILITY_THRESHOLD ? COLOR_STABLE : COLOR_UNSTABLE;

  // ── Dashed M1–M2 axis line ──────────────────────────────────────────────────
  drawDashedLine(x1 - 30, CY, x2 + 30, CY);

  // ── Dashed equilateral triangles to L4 and L5 ──────────────────────────────
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = l45color;
  ctx.globalAlpha = 0.35;
  // Triangle to L4
  ctx.beginPath();
  ctx.moveTo(x1, CY);
  ctx.lineTo(L.L4.x, L.L4.y);
  ctx.lineTo(x2, CY);
  ctx.stroke();
  // Triangle to L5
  ctx.beginPath();
  ctx.moveTo(x1, CY);
  ctx.lineTo(L.L5.x, L.L5.y);
  ctx.lineTo(x2, CY);
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.restore();

  // ── Lagrange points ─────────────────────────────────────────────────────────
  // L1 — between M1 and M2, label above
  drawLagrangePoint(L.L1.x, L.L1.y, COLOR_UNSTABLE, 'L1',  0, -20);
  // L2 — beyond M2, label above
  drawLagrangePoint(L.L2.x, L.L2.y, COLOR_UNSTABLE, 'L2',  0, -20);
  // L3 — opposite M2, label above
  drawLagrangePoint(L.L3.x, L.L3.y, COLOR_UNSTABLE, 'L3',  0, -20);
  // L4 — leading (above on canvas), label to upper-right
  drawLagrangePoint(L.L4.x, L.L4.y, l45color,       'L4', +22,  -8);
  // L5 — trailing (below on canvas), label to lower-right
  drawLagrangePoint(L.L5.x, L.L5.y, l45color,       'L5', +22,  +8);

  // ── Main bodies ─────────────────────────────────────────────────────────────
  // M1: big yellow body (Sun-like), radius scales with 1−μ
  const r1 = Math.max(10, 18 * (1 - mu));
  drawBody(x1, CY, r1, COLOR_M1, 'M\u2081', 0, -(r1 + 14));

  // M2: smaller blue body, radius scales with μ
  const r2 = Math.max(4, 14 * mu + 5);
  drawBody(x2, CY, r2, COLOR_M2, 'M\u2082', 0, -(r2 + 14));

  // ── CoM marker ─────────────────────────────────────────────────────────────
  ctx.strokeStyle = COLOR_MUTED;
  ctx.lineWidth = 1.5;
  const csz = 5;
  ctx.beginPath();
  ctx.moveTo(CX - csz, CY); ctx.lineTo(CX + csz, CY);
  ctx.moveTo(CX, CY - csz); ctx.lineTo(CX, CY + csz);
  ctx.stroke();
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('CoM', CX + 7, CY + 4);

  // ── Legend (top-left) ───────────────────────────────────────────────────────
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const legendItems = [
    { color: COLOR_UNSTABLE, label: 'Unstable (L1, L2, L3 always; L4/L5 if μ₂ ≥ 0.0385)' },
    { color: COLOR_STABLE,   label: 'Stable (L4, L5 when μ₂ < 0.0385)' },
  ];
  legendItems.forEach(({ color, label }, i) => {
    const lx = 16;
    const ly = 18 + i * 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = COLOR_MUTED;
    ctx.fillText(label, lx + 12, ly);
  });
}

// ── UI sync ───────────────────────────────────────────────────────────────────
function updateReadout() {
  const mu = mu2FromRatio(massRatio);
  const stable = mu < STABILITY_THRESHOLD;
  stabilityOut.textContent = `μ₂ = ${mu.toFixed(6)}   |   L4/L5 stable: ${stable ? 'YES' : 'NO'}`;
  stabilityOut.style.color = stable ? COLOR_STABLE : COLOR_UNSTABLE;
}

function syncAll() {
  const mu = mu2FromRatio(massRatio);
  ratioVal.textContent = massRatio.toFixed(3);
  updateReadout();
  draw();
  // Update rendered math μ₂ display if needed (static equations already rendered)
}

massRatioInput.addEventListener('input', () => {
  massRatio = parseFloat(massRatioInput.value);
  syncAll();
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const mu = parseFloat(btn.dataset.mu);
    // Convert μ₂ back to m2/m1: μ₂ = r/(1+r) → r = μ₂/(1−μ₂)
    massRatio = mu / (1 - mu);
    // Clamp to slider range
    massRatio = Math.max(0.001, Math.min(0.5, massRatio));
    massRatioInput.value = massRatio.toFixed(6);
    syncAll();
  });
});

// ── Initial render ────────────────────────────────────────────────────────────
syncAll();
