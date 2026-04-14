import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ─── DOM refs ────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('tidal');
const ctx      = canvas.getContext('2d');
const distInput = document.getElementById('dist');
const distVal   = document.getElementById('dist-val');
const roD       = document.getElementById('ro-d');
const roG       = document.getElementById('ro-g');
const roF       = document.getElementById('ro-f');

// ─── Layout constants ────────────────────────────────────────────────────────
const W           = canvas.width;   // 900
const H           = canvas.height;  // 400
const PRIMARY_X   = 110;            // x-position of primary mass (fixed, left)
const PRIMARY_Y   = H / 2;
const PRIMARY_R   = 38;             // visual radius of M
const SECONDARY_R = 32;             // undeformed radius of secondary body

// ─── Physics normalisation ───────────────────────────────────────────────────
// Reference distance for relative readouts
const D_REF       = 400;

// Roche threshold (pixels)
const ROCHE_LIMIT = 100;

// Stretch mapping: at d = D_REF the stretch factor s = 0.
// We want stretch to obey 1/d³ exactly.
// We define:   s(d) = k / d³   such that s(D_REF) = STRETCH_AT_REF.
const STRETCH_AT_REF = 0.18;       // 18 % stretch at d = 400 px
const STRETCH_K      = STRETCH_AT_REF * D_REF ** 3;

// ─── State ───────────────────────────────────────────────────────────────────
let d = parseFloat(distInput.value);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function stretchFactor(dist) {
  return STRETCH_K / dist ** 3;
}

function updateReadout(dist) {
  const gNorm = (D_REF / dist) ** 2;   // 1/d² relative to D_REF
  const fNorm = (D_REF / dist) ** 3;   // 1/d³ relative to D_REF
  distVal.textContent = dist.toFixed(0);
  roD.textContent     = `${dist.toFixed(0)} px`;
  roG.textContent     = gNorm.toFixed(2);
  roF.textContent     = fNorm.toFixed(2);
}

// Draw an arrow from (x1,y1) toward (x2,y2) with a given length.
function drawArrow(x1, y1, dx, dy, len, color) {
  const mag = Math.hypot(dx, dy) || 1;
  const ux  = dx / mag;
  const uy  = dy / mag;
  const tx  = x1 + ux * len;
  const ty  = y1 + uy * len;
  const hw  = 5;   // arrowhead half-width
  const hl  = 10;  // arrowhead length

  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(tx - ux * hl, ty - uy * hl);
  ctx.stroke();

  // arrowhead
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - ux * hl - uy * hw, ty - uy * hl + ux * hw);
  ctx.lineTo(tx - ux * hl + uy * hw, ty - uy * hl - ux * hw);
  ctx.closePath();
  ctx.fill();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  const beyondRoche = d < ROCHE_LIMIT;
  const s           = stretchFactor(d);

  // Secondary centre: positioned to the right of primary by d
  // Keep it inside the canvas (clamp near right edge for display clarity).
  const secX = Math.min(PRIMARY_X + d, W - 70);
  const secY = PRIMARY_Y;

  // Stretch: radial semi-axis (along primary axis) grows, lateral shrinks
  // to conserve area approximately.  rx·ry ≈ R² (area-preserving).
  const rx = SECONDARY_R * (1 + s);      // semi-axis toward/away primary
  const ry = SECONDARY_R / (1 + s);      // semi-axis perpendicular

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, W, H);

  // ── Primary mass M (yellow) ──────────────────────────────────────────────
  // Glow
  const glow = ctx.createRadialGradient(PRIMARY_X, PRIMARY_Y, PRIMARY_R * 0.3,
                                         PRIMARY_X, PRIMARY_Y, PRIMARY_R * 2.2);
  glow.addColorStop(0,   'rgba(255,209,102,0.30)');
  glow.addColorStop(0.5, 'rgba(255,209,102,0.08)');
  glow.addColorStop(1,   'rgba(255,209,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(PRIMARY_X, PRIMARY_Y, PRIMARY_R * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(PRIMARY_X, PRIMARY_Y, PRIMARY_R, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#0e1116';
  ctx.font      = 'bold 16px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', PRIMARY_X, PRIMARY_Y);

  // ── Dashed line: primary → secondary ────────────────────────────────────
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(PRIMARY_X + PRIMARY_R, PRIMARY_Y);
  ctx.lineTo(secX - rx, secY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Distance label at midpoint
  const midX = (PRIMARY_X + PRIMARY_R + secX - rx) / 2;
  ctx.fillStyle    = '#8b949e';
  ctx.font         = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('d', midX, PRIMARY_Y - 8);

  // ── Secondary body ellipse ───────────────────────────────────────────────
  const ellipseColor = beyondRoche ? '#ff4444' : '#7aa2f7';
  const ellipseAlpha = beyondRoche ? 0.55       : 0.35;

  // Fill (semi-transparent)
  ctx.fillStyle = beyondRoche
    ? `rgba(255,68,68,${ellipseAlpha})`
    : `rgba(122,162,247,${ellipseAlpha})`;
  ctx.beginPath();
  ctx.ellipse(secX, secY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = ellipseColor;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.ellipse(secX, secY, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Undeformed circle (dashed, for reference)
  if (!beyondRoche) {
    ctx.strokeStyle = 'rgba(122,162,247,0.25)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(secX, secY, SECONDARY_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Label
  ctx.fillStyle    = ellipseColor;
  ctx.font         = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('m', secX, secY + ry + 5);

  // ── Tidal arrows ─────────────────────────────────────────────────────────
  // Arrow length scales with tidal force (1/d³), normalised for visibility.
  const fNorm    = (D_REF / d) ** 3;
  const arrowLen = Math.min(10 + fNorm * 25, 120);   // cap so it doesn't overwhelm

  // Direction toward primary (negative x)
  const towardDx = PRIMARY_X - secX;
  const awayDx   = secX - PRIMARY_X;

  // Near-side: arrow at the near surface point, pointing TOWARD primary
  drawArrow(secX - rx, secY, towardDx, 0, arrowLen, '#ffd166');

  // Far-side: arrow at the far surface point, pointing AWAY from primary
  drawArrow(secX + rx, secY, awayDx, 0, arrowLen, '#ffd166');

  // Top: small inward arrow (compression)
  const compLen = Math.min(6 + fNorm * 10, 55);
  drawArrow(secX, secY - ry, 0, 1, compLen, '#bb9af7');

  // Bottom: small inward arrow (compression)
  drawArrow(secX, secY + ry, 0, -1, compLen, '#bb9af7');

  // ── Numeric readout (top-left of canvas) ─────────────────────────────────
  const gNorm = (D_REF / d) ** 2;

  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#e6edf3';
  ctx.font      = '14px -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`d = ${d.toFixed(0)} px`, 16, 14);

  ctx.fillStyle = '#7aa2f7';
  ctx.fillText(`g  ∝ 1/d²  = ${gNorm.toFixed(2)}  (relative)`, 16, 34);

  ctx.fillStyle = '#ffd166';
  ctx.fillText(`F_tide ∝ 1/d³ = ${fNorm.toFixed(2)}  (relative)`, 16, 54);

  // ── Roche warning ────────────────────────────────────────────────────────
  if (beyondRoche) {
    ctx.fillStyle = 'rgba(255,68,68,0.15)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle    = '#ff4444';
    ctx.font         = 'bold 15px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('BEYOND ROCHE LIMIT — body disrupts', W / 2, 12);
  }

  // ── Stretch label near secondary ─────────────────────────────────────────
  if (!beyondRoche) {
    ctx.fillStyle    = 'rgba(122,162,247,0.70)';
    ctx.font         = '12px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`stretch ${(s * 100).toFixed(1)}%`, secX, secY + ry + 20);
  }
}

// ─── Sync & event ─────────────────────────────────────────────────────────────
function sync() {
  d = parseFloat(distInput.value);
  updateReadout(d);
  draw();
}

distInput.addEventListener('input', sync);
sync();
