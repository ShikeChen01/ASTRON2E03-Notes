import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('wc-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 860
const H = canvas.height;  // 420

// Two panels side-by-side
const SPLIT = W / 2;  // 430
const PAD = 20;

// ─── Shared state ────────────────────────────────────────────────────────────
let omega = 1.0;   // rotation rate (arb.)
let speed = 1.5;   // initial parcel speed (arb.)
let northHemi = true;  // N hemisphere → deflect right

// Disc / domain parameters (left panel, local coords)
const DISC_R = 160;        // px radius of rotating disc
const DISC_CX = SPLIT / 2; // centre x of left panel
const DISC_CY = H / 2;     // centre y of left panel
const L_UNITS = 1.0;        // L in Rossby = disc radius in "units"

// Parcel state (left panel, in "unit" coords where disc radius = 1)
let px, py, pvx, pvy;       // position & velocity in rotating frame
let trail = [];              // [{x,y}] in unit coords
const TRAIL_MAX = 600;

// Rotation angle for disc indicator
let discAngle = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rossby() {
  return speed / (2 * omega * L_UNITS);
}

function toCanvas(ux, uy) {
  // unit coords (disc centre = 0, radius = 1) → canvas pixel (left panel)
  return [DISC_CX + ux * DISC_R, DISC_CY + uy * DISC_R];
}

function resetParcel() {
  // Start parcel at (0.5, 0) — mid-right of disc
  px = 0.5;
  py = 0.0;
  // Launch upward (northward) — direction in rotating frame
  const angle = -Math.PI / 2;
  pvx = speed * Math.cos(angle);
  pvy = speed * Math.sin(angle);
  trail = [{ x: px, y: py }];
}

// ─── Slider / button wiring ───────────────────────────────────────────────────
const omegaSlider = document.getElementById('omega-slider');
const speedSlider = document.getElementById('speed-slider');
const omegaVal = document.getElementById('omega-val');
const speedVal = document.getElementById('speed-val');
const btnHemi = document.getElementById('btn-hemi');

omegaSlider.addEventListener('input', () => {
  omega = parseFloat(omegaSlider.value);
  omegaVal.textContent = omega.toFixed(2);
  resetParcel();
});

speedSlider.addEventListener('input', () => {
  speed = parseFloat(speedSlider.value);
  speedVal.textContent = speed.toFixed(2);
  resetParcel();
});

btnHemi.addEventListener('click', () => {
  northHemi = !northHemi;
  btnHemi.textContent = `Hemisphere: ${northHemi ? 'N' : 'S'}`;
  resetParcel();
});

document.getElementById('btn-reset').addEventListener('click', resetParcel);

function setOmega(val) {
  omega = val;
  omegaSlider.value = val;
  omegaVal.textContent = val.toFixed(2);
  resetParcel();
}

document.getElementById('btn-venus').addEventListener('click', () => setOmega(0.15));
document.getElementById('btn-earth').addEventListener('click', () => setOmega(1.0));
document.getElementById('btn-jupiter').addEventListener('click', () => setOmega(4.5));

// ─── Physics integration ─────────────────────────────────────────────────────
const DT = 1 / 60;  // one frame in "seconds"

function stepParcel() {
  // Coriolis acceleration in rotating frame:
  // a_x = +2Ω·vy  (N hemi, right-hand)
  // a_y = -2Ω·vx
  // Sign flip for S hemisphere.
  const sign = northHemi ? 1 : -1;
  const ax = sign * 2 * omega * pvy;
  const ay = -sign * 2 * omega * pvx;

  pvx += ax * DT;
  pvy += ay * DT;
  px += pvx * DT;
  py += pvy * DT;

  // If parcel leaves the disc, wrap it back to start
  const r2 = px * px + py * py;
  if (r2 > 1.05 * 1.05) {
    resetParcel();
    return;
  }

  trail.push({ x: px, y: py });
  if (trail.length > TRAIL_MAX) trail.shift();
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────
const COL = {
  fg: '#e6edf3',
  muted: '#8b949e',
  accent: '#7aa2f7',
  accent2: '#bb9af7',
  warm: '#ffd166',
  good: '#9ece6a',
  bad: '#f7768e',
  panelBg: 'rgba(22,27,34,0.85)',
  discBg: 'rgba(30,40,60,0.7)',
};

function drawLeftPanel() {
  const cx = DISC_CX;
  const cy = DISC_CY;
  const r = DISC_R;

  // Background
  ctx.fillStyle = COL.panelBg;
  ctx.fillRect(0, 0, SPLIT, H);

  // Panel label
  ctx.fillStyle = COL.muted;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Coriolis deflection  (rotating frame)', PAD, PAD + 10);

  // Draw disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COL.discBg;
  ctx.fill();
  ctx.strokeStyle = COL.muted;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Rotation direction indicator (curved arrow around edge)
  const arrowR = r + 12;
  const sweepStart = discAngle;
  const sweepEnd = discAngle + (northHemi ? 1.4 : -1.4);
  ctx.beginPath();
  ctx.arc(cx, cy, arrowR, sweepStart, sweepEnd, !northHemi);
  ctx.strokeStyle = COL.warm;
  ctx.lineWidth = 2;
  ctx.stroke();
  // arrowhead
  const ahAngle = sweepEnd + (northHemi ? 0.1 : -0.1);
  const ahx = cx + arrowR * Math.cos(ahAngle);
  const ahy = cy + arrowR * Math.sin(ahAngle);
  const tangAngle = ahAngle + (northHemi ? Math.PI / 2 : -Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(ahx, ahy);
  ctx.lineTo(ahx + 6 * Math.cos(tangAngle - 0.4), ahy + 6 * Math.sin(tangAngle - 0.4));
  ctx.lineTo(ahx + 6 * Math.cos(tangAngle + 0.4), ahy + 6 * Math.sin(tangAngle + 0.4));
  ctx.closePath();
  ctx.fillStyle = COL.warm;
  ctx.fill();

  // Ω label
  ctx.fillStyle = COL.warm;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Ω = ${omega.toFixed(2)}`, cx - r + 4, cy - r + 16);

  // Latitude rings (subtle)
  for (const frac of [0.33, 0.67]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139,148,158,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Pole dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = COL.accent2;
  ctx.fill();
  ctx.fillStyle = COL.muted;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(northHemi ? 'N pole' : 'S pole', cx, cy - 8);

  // Trail
  if (trail.length > 1) {
    ctx.beginPath();
    const [tx0, ty0] = toCanvas(trail[0].x, trail[0].y);
    ctx.moveTo(tx0, ty0);
    for (let i = 1; i < trail.length; i++) {
      const [tx, ty] = toCanvas(trail[i].x, trail[i].y);
      ctx.lineTo(tx, ty);
      // Fade older trail segments
      if (i % 40 === 0) {
        ctx.strokeStyle = `rgba(187,154,247,${0.15 + 0.7 * (i / trail.length)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, ty);
      }
    }
    ctx.strokeStyle = COL.accent2;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Parcel dot
  const [ppx, ppy] = toCanvas(px, py);
  ctx.beginPath();
  ctx.arc(ppx, ppy, 6, 0, Math.PI * 2);
  ctx.fillStyle = COL.bad;
  ctx.fill();
  ctx.strokeStyle = COL.fg;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Velocity vector
  const vScale = 30;
  ctx.beginPath();
  ctx.moveTo(ppx, ppy);
  ctx.lineTo(ppx + pvx * vScale, ppy + pvy * vScale);
  ctx.strokeStyle = COL.good;
  ctx.lineWidth = 2;
  ctx.stroke();
  // arrowhead on velocity
  const vAngle = Math.atan2(pvy, pvx);
  ctx.beginPath();
  ctx.moveTo(ppx + pvx * vScale, ppy + pvy * vScale);
  ctx.lineTo(
    ppx + pvx * vScale - 8 * Math.cos(vAngle - 0.4),
    ppy + pvy * vScale - 8 * Math.sin(vAngle - 0.4)
  );
  ctx.lineTo(
    ppx + pvx * vScale - 8 * Math.cos(vAngle + 0.4),
    ppy + pvy * vScale - 8 * Math.sin(vAngle + 0.4)
  );
  ctx.closePath();
  ctx.fillStyle = COL.good;
  ctx.fill();

  // Ro readout
  const Ro = rossby();
  const roLabel = Ro < 1 ? 'rotation-dominated' : 'inertia-dominated';
  const roColor = Ro < 1 ? COL.accent : COL.warm;
  ctx.fillStyle = roColor;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Ro = ${Ro.toFixed(2)}  — ${roLabel}`, cx, H - PAD - 4);
}

// ─── Right panel: Hadley / zonal-band schematic ───────────────────────────────

function cellLabel() {
  if (omega < 0.4) return { cells: 1, label: '1 cell / hemisphere', tag: 'Venus-like' };
  if (omega < 2.5) return { cells: 3, label: '3 cells / hemisphere', tag: 'Earth-like' };
  return { cells: 'many', label: 'many zonal bands', tag: 'Jupiter-like' };
}

function drawArrow(x1, y1, x2, y2, color, headLen = 8) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(a - 0.4), y2 - headLen * Math.sin(a - 0.4));
  ctx.lineTo(x2 - headLen * Math.cos(a + 0.4), y2 - headLen * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawRightPanel() {
  const ox = SPLIT;
  const cx = ox + (W - SPLIT) / 2;  // centre x of right panel
  const cy = H / 2;
  const R = 150;  // planet circle radius

  // Background
  ctx.fillStyle = COL.panelBg;
  ctx.fillRect(SPLIT, 0, W - SPLIT, H);

  // Separator line
  ctx.beginPath();
  ctx.moveTo(SPLIT, PAD);
  ctx.lineTo(SPLIT, H - PAD);
  ctx.strokeStyle = COL.muted;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Panel label
  ctx.fillStyle = COL.muted;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Hadley cells / zonal bands', SPLIT + PAD, PAD + 10);

  const info = cellLabel();

  if (info.cells === 1) {
    // ── Single Hadley cell per hemisphere (Venus-like) ──
    // Draw planet circle
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,180,50,0.12)';
    ctx.fill();
    ctx.strokeStyle = COL.warm;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Equator line
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.strokeStyle = 'rgba(139,148,158,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cell label top
    ctx.fillStyle = COL.muted;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('pole', cx, cy - R - 6);
    ctx.fillText('equator', cx + R + 32, cy);
    ctx.fillText('pole', cx, cy + R + 14);

    // Rising arrows at equator (centre)
    drawArrow(cx, cy - 10, cx, cy - R + 20, COL.accent);   // N: rise → pole
    drawArrow(cx, cy + 10, cx, cy + R - 20, COL.accent);   // S: rise → pole

    // Poleward flow aloft (inside top half, curved suggestion with lines)
    // N hemisphere: top arc flow from equator side outward
    for (const side of [-1, 1]) {
      drawArrow(cx + side * 20, cy - R + 25, cx + side * (R - 25), cy - 15, COL.accent2);
    }
    // S hemisphere
    for (const side of [-1, 1]) {
      drawArrow(cx + side * 20, cy + R - 25, cx + side * (R - 25), cy + 15, COL.accent2);
    }

    // Sinking arrows at poles
    drawArrow(cx - 12, cy - R + 18, cx - 12, cy - R + 50, COL.bad);
    drawArrow(cx + 12, cy - R + 18, cx + 12, cy - R + 50, COL.bad);
    drawArrow(cx - 12, cy + R - 18, cx - 12, cy + R - 50, COL.bad);
    drawArrow(cx + 12, cy + R - 18, cx + 12, cy + R - 50, COL.bad);

    ctx.fillStyle = COL.warm;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RISING', cx, cy - 18);
    ctx.fillText('SINKING', cx, cy - R + 66);
    ctx.fillText('RISING', cx, cy + 22);
    ctx.fillText('SINKING', cx, cy + R - 62);

  } else if (info.cells === 3) {
    // ── Three cells per hemisphere (Earth-like) ──
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(122,162,247,0.10)';
    ctx.fill();
    ctx.strokeStyle = COL.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cell boundaries at ~30° and ~60° latitude
    // In canvas: 30° = R*sin(30°)=0.5R, 60° = R*sin(60°)=0.866R from equator
    const lat30 = R * 0.5;
    const lat60 = R * 0.866;

    const lineStyle = 'rgba(139,148,158,0.3)';
    for (const dy of [0, lat30, -lat30, lat60, -lat60]) {
      const halfW = Math.sqrt(Math.max(0, R * R - dy * dy));
      ctx.beginPath();
      ctx.moveTo(cx - halfW, cy + dy);
      ctx.lineTo(cx + halfW, cy + dy);
      ctx.strokeStyle = lineStyle;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = COL.muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('pole 90°', cx - R - 2, cy - lat60);
    ctx.fillText('60°', cx - R - 2, cy - lat30);
    ctx.fillText('30°', cx - R - 2, cy);
    ctx.fillText('EQ 0°', cx - R - 2, cy + 4);
    ctx.fillText('30°', cx - R - 2, cy + lat30);
    ctx.fillText('60°', cx - R - 2, cy + lat60);
    ctx.fillText('pole 90°', cx - R - 2, cy + lat60 + 12);

    // N hemisphere cells (arrows inside globe):
    // Hadley: EQ→30° rising at EQ, sinking at 30°
    drawArrow(cx + 15, cy - 8, cx + 15, cy - lat30 + 8, COL.accent);    // rising at EQ
    drawArrow(cx - 15, cy - lat30 + 30, cx - 15, cy - 8, COL.bad);       // return flow

    // Ferrel: 30°→60°
    drawArrow(cx + 15, cy - lat30 - 5, cx + 15, cy - lat60 + 8, COL.accent2);
    drawArrow(cx - 15, cy - lat60 + 30, cx - 15, cy - lat30 - 5, COL.bad);

    // Polar: 60°→pole
    drawArrow(cx + 10, cy - lat60 - 5, cx + 10, cy - R + 18, COL.accent);
    drawArrow(cx - 10, cy - R + 25, cx - 10, cy - lat60 - 5, COL.bad);

    // S hemisphere cells (mirror)
    drawArrow(cx + 15, cy + 8, cx + 15, cy + lat30 - 8, COL.accent);
    drawArrow(cx - 15, cy + lat30 - 30, cx - 15, cy + 8, COL.bad);
    drawArrow(cx + 15, cy + lat30 + 5, cx + 15, cy + lat60 - 8, COL.accent2);
    drawArrow(cx - 15, cy + lat60 - 30, cx - 15, cy + lat30 + 5, COL.bad);
    drawArrow(cx + 10, cy + lat60 + 5, cx + 10, cy + R - 18, COL.accent);
    drawArrow(cx - 10, cy + R - 25, cx - 10, cy + lat60 + 5, COL.bad);

    // Cell name labels
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.accent;
    ctx.fillText('Hadley', cx + 40, cy - lat30 / 2);
    ctx.fillStyle = COL.accent2;
    ctx.fillText('Ferrel', cx + 40, cy - (lat30 + lat60) / 2);
    ctx.fillStyle = COL.accent;
    ctx.fillText('Polar', cx + 35, cy - (lat60 + R) / 2 - 5);
    ctx.fillStyle = COL.accent;
    ctx.fillText('Hadley', cx + 40, cy + lat30 / 2);
    ctx.fillStyle = COL.accent2;
    ctx.fillText('Ferrel', cx + 40, cy + (lat30 + lat60) / 2);
    ctx.fillStyle = COL.accent;
    ctx.fillText('Polar', cx + 35, cy + (lat60 + R) / 2 + 5);

  } else {
    // ── Many zonal bands (Jupiter-like) ──
    const nBands = Math.round(4 + (omega - 2.5) * 1.5);  // 4–9 bands visible
    const clipR = R;

    // Draw planet disc as clipping region
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, clipR, 0, Math.PI * 2);
    ctx.clip();

    // Alternating belt (dark, sinking) and zone (bright, rising) bands
    const bandH = (2 * clipR) / (2 * nBands);
    for (let i = 0; i < 2 * nBands; i++) {
      const y0 = cy - clipR + i * bandH;
      const isBelt = i % 2 === 0;
      ctx.fillStyle = isBelt
        ? 'rgba(180,120,60,0.55)'   // belt: brownish
        : 'rgba(240,220,180,0.25)'; // zone: pale
      ctx.fillRect(cx - clipR, y0, 2 * clipR, bandH);
    }

    // Zonal jet arrows (alternating east/west)
    for (let i = 0; i < 2 * nBands - 1; i++) {
      const y = cy - clipR + (i + 1) * bandH;
      const eastward = i % 2 === 0;
      const arrowColor = eastward ? COL.accent : COL.accent2;
      const hw = clipR * 0.55;
      if (eastward) {
        drawArrow(cx - hw, y, cx + hw, y, arrowColor, 7);
      } else {
        drawArrow(cx + hw, y, cx - hw, y, arrowColor, 7);
      }
    }

    ctx.restore();

    // Planet outline
    ctx.beginPath();
    ctx.arc(cx, cy, clipR, 0, Math.PI * 2);
    ctx.strokeStyle = COL.warm;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rising / sinking legend
    ctx.fillStyle = 'rgba(240,220,180,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('zone (bright, ↑)', cx - clipR - 4, cy - clipR / 2);
    ctx.fillStyle = 'rgba(180,120,60,0.9)';
    ctx.fillText('belt (dark, ↓)', cx - clipR - 4, cy);

    // K-H instability note
    ctx.fillStyle = COL.muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('K–H instability at band edges', cx, cy + clipR + 14);
  }

  // Bottom readout
  const info2 = cellLabel();
  ctx.fillStyle = COL.accent;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${info2.label}  (${info2.tag})`, cx, H - PAD - 4);
}

// ─── Main animation loop ──────────────────────────────────────────────────────
function frame() {
  // Advance disc rotation indicator
  discAngle += omega * 0.015;

  // Step physics multiple times per frame for smoother trail at low omega
  for (let i = 0; i < 2; i++) stepParcel();

  // Clear
  ctx.clearRect(0, 0, W, H);

  drawLeftPanel();
  drawRightPanel();

  requestAnimationFrame(frame);
}

resetParcel();
requestAnimationFrame(frame);
