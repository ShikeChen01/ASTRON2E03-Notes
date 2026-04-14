import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const canvas  = document.getElementById('gh-canvas');
const ctx     = canvas.getContext('2d');
const slN     = document.getElementById('sl-N');
const slTeq   = document.getElementById('sl-Teq');
const lblN    = document.getElementById('lbl-N');
const lblTeq  = document.getElementById('lbl-Teq');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let N   = parseInt(slN.value, 10);
let Teq = parseFloat(slTeq.value);

function Ts(n, teq) {
  return teq * Math.pow(n + 1, 0.25);
}

// Temperature of layer i (1-indexed from bottom) given N total layers
// From energy balance: T_i^4 = T_eq^4 * (N+1-i+1) ... but simpler derivation:
// T_i = T_eq * (N + 1 - i + 1)^(1/4)  — layer 1 (bottom) is hottest
function layerTemp(i, n, teq) {
  // Layer 1 = bottom-most. Energy balance gives T_i^4 = T_eq^4 * (N+1-i+1)
  // i.e. T_i = T_eq * (N - i + 2)^(1/4)
  return teq * Math.pow(n - i + 2, 0.25);
}

// ---------------------------------------------------------------------------
// Sync UI labels
// ---------------------------------------------------------------------------
function syncLabels() {
  lblN.textContent   = N;
  lblTeq.textContent = Teq;
}

slN.addEventListener('input', () => {
  N = parseInt(slN.value, 10);
  syncLabels();
  draw();
});

slTeq.addEventListener('input', () => {
  Teq = parseFloat(slTeq.value);
  syncLabels();
  draw();
});

syncLabels();

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
function lerpColor(hex1, hex2, t) {
  const parse = h => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

// Map a temperature (K) to a slab fill colour.
// Cold (~100K) → dark blue-grey; warm (~400K) → warm amber/orange
function tempToColor(T, alpha = 0.55) {
  const t = Math.max(0, Math.min(1, (T - 100) / 350));
  let r, g, b;
  if (t < 0.5) {
    // dark blue-grey → muted teal
    r = Math.round(22  + (30  - 22)  * (t * 2));
    g = Math.round(27  + (60  - 27)  * (t * 2));
    b = Math.round(34  + (80  - 34)  * (t * 2));
  } else {
    // muted teal → warm amber
    const u = (t - 0.5) * 2;
    r = Math.round(30  + (200 - 30)  * u);
    g = Math.round(60  + (140 - 60)  * u);
    b = Math.round(80  + (20  - 80)  * u);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

// Ground colour shifts with surface temperature
function groundColor(tsK) {
  const t = Math.max(0, Math.min(1, (tsK - 200) / 300));
  return lerpColor('#1a2030', '#8b3a10', t);
}

// ---------------------------------------------------------------------------
// Arrow drawing
// ---------------------------------------------------------------------------
function drawArrow(x1, y1, x2, y2, color, width = 2, headSize = 8) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = width;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * headSize, y2 - uy * headSize);
  ctx.stroke();

  // Arrowhead
  const px = -uy, py = ux;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * headSize - px * (headSize * 0.5),
             y2 - uy * headSize - py * (headSize * 0.5));
  ctx.lineTo(x2 - ux * headSize + px * (headSize * 0.5),
             y2 - uy * headSize + py * (headSize * 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Wavy (sinusoidal) arrow for visible-light / solar beam
function drawWavyArrow(x, yTop, yBot, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.globalAlpha = 0.9;
  ctx.setLineDash([]);

  const amp   = 4;
  const freq  = 0.08;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  for (let y = yTop; y <= yBot - 12; y += 1) {
    ctx.lineTo(x + amp * Math.sin(freq * (y - yTop) * Math.PI), y);
  }
  ctx.stroke();

  // Arrowhead at bottom
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, yBot);
  ctx.lineTo(x - 6, yBot - 12);
  ctx.lineTo(x + 6, yBot - 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Sun symbol
function drawSun(cx, cy, r) {
  ctx.save();
  ctx.fillStyle   = '#ffd166';
  ctx.strokeStyle = '#ffd166';
  ctx.globalAlpha = 0.95;

  // Rays
  ctx.lineWidth = 2;
  const nRays = 8;
  for (let i = 0; i < nRays; i++) {
    const angle = (i / nRays) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (r + 3), cy + Math.sin(angle) * (r + 3));
    ctx.lineTo(cx + Math.cos(angle) * (r + 10), cy + Math.sin(angle) * (r + 10));
    ctx.stroke();
  }

  // Disk
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Left panel: stacked-layer diagram
// ---------------------------------------------------------------------------
function drawLayerDiagram(W, H) {
  const padL = 20, padR = 20, padT = 20, padB = 20;
  const drawW = W - padL - padR;
  const drawH = H - padT - padB;

  const groundH = 28;
  const groundY = padT + drawH - groundH;
  const spaceH  = 40;
  const atmoH   = drawH - groundH - spaceH;

  // Space background
  ctx.fillStyle = '#0e1116';
  ctx.fillRect(padL, padT, drawW, spaceH);

  // Stars sprinkled in space
  ctx.fillStyle = 'rgba(230,237,243,0.5)';
  const starSeed = [7, 23, 41, 61, 83, 103, 127, 151];
  starSeed.forEach((s, idx) => {
    const sx = padL + (s * 37 + idx * 53) % drawW;
    const sy = padT + (s * 13 + idx * 19) % spaceH;
    ctx.beginPath();
    ctx.arc(sx, sy, 1, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Ground
  const tsK = Ts(N, Teq);
  ctx.fillStyle = groundColor(tsK);
  ctx.fillRect(padL, groundY, drawW, groundH);
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, groundY, drawW, groundH);

  // Ground label
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GROUND', padL + drawW / 2, groundY + groundH / 2);

  // Atmospheric layers (if N > 0)
  const layerH = N > 0 ? atmoH / N : atmoH;
  for (let i = 1; i <= N; i++) {
    const T_i = layerTemp(i, N, Teq);
    const ly  = padT + spaceH + (N - i) * layerH; // layer 1 (hottest) is at bottom

    ctx.fillStyle = tempToColor(T_i, 0.60);
    ctx.fillRect(padL, ly, drawW, layerH);

    ctx.strokeStyle = 'rgba(139,148,158,0.4)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(padL, ly, drawW, layerH);

    // Layer temperature label
    ctx.fillStyle = '#e6edf3';
    ctx.font      = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Layer ${i}  T = ${Math.round(T_i)} K`, padL + 8, ly + layerH / 2);
  }

  // If N=0: show transparent atmosphere region label
  if (N === 0) {
    ctx.fillStyle = 'rgba(139,148,158,0.08)';
    ctx.fillRect(padL, padT + spaceH, drawW, atmoH);
    ctx.fillStyle = '#8b949e';
    ctx.font = '13px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('no atmosphere (N = 0)', padL + drawW / 2, padT + spaceH + atmoH / 2);
  }

  // ---- Flux arrows --------------------------------------------------------
  const arrowX  = padL + drawW * 0.62;  // IR arrows column
  const arrowW  = 18;                   // horizontal offset for down arrow
  const IR_COLOR = '#ffd166';

  // From ground upward into first layer (or to space if N=0)
  const groundMidY = groundY + groundH / 2;
  const layer1Top  = N > 0 ? padT + spaceH + (N - 1) * layerH : padT + spaceH;
  const layer1Bot  = padT + spaceH + N * layerH;
  const layer1MidY = N > 0 ? (layer1Top + layer1Bot) / 2 : padT + spaceH;

  // Arrow from ground surface upward (σT_s⁴)
  drawArrow(arrowX, groundY, arrowX, layer1MidY - 6, IR_COLOR, 2, 7);

  // Flux label next to ground-up arrow
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('σT\u2074s', arrowX + 6, groundY - 10);
  ctx.restore();

  // For each layer: up arrow and down arrow
  for (let i = 1; i <= N; i++) {
    const ly     = padT + spaceH + (N - i) * layerH;
    const lMidY  = ly + layerH / 2;
    const lTop   = ly;
    const lBot   = ly + layerH;

    // Up arrow (to next layer top or space)
    const upTarget = i === N ? padT + spaceH / 2 : lTop - layerH / 2;
    drawArrow(arrowX, lMidY, arrowX, upTarget, IR_COLOR, 2, 7);

    // Down arrow (to layer below mid or to ground)
    const downTarget = i === 1 ? groundY : lBot + layerH / 2;
    drawArrow(arrowX + arrowW, lMidY, arrowX + arrowW, downTarget, IR_COLOR, 2, 7);
  }

  // ---- Solar visible-light arrow (from sun, pierces all layers) -----------
  const sunX = padL + drawW - 38;
  const sunY = padT + 18;
  drawSun(sunX, sunY, 12);

  const solarX = sunX - 26;
  drawWavyArrow(solarX, padT + spaceH, groundY, '#ffd166');

  // "visible" label
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('visible', solarX - 5, padT + spaceH + atmoH / 2);
  ctx.restore();

  // "IR" label near IR arrows
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('IR', arrowX + arrowW / 2, padT + spaceH - 4);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Right panel: readout + comparison bars
// ---------------------------------------------------------------------------
function drawReadout(offsetX, W, H) {
  const padL   = 24, padR = 16, padT = 20;
  const tsK    = Ts(N, Teq);
  const excess = tsK - Teq;

  // Title
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 14px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Temperature readout', offsetX + padL + (W - padL - padR) / 2, padT);

  const lineH = 28;
  let yCursor = padT + 26;

  // T_eq line
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`T\u2091q = ${Math.round(Teq)} K`, offsetX + padL, yCursor);
  yCursor += lineH;

  // T_s line (highlighted)
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 15px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`T\u209B = ${Math.round(tsK)} K`, offsetX + padL, yCursor);
  yCursor += lineH - 4;

  // Formula reminder
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`= T\u2091q \u00D7 (N+1)\u00B9\u2044\u2074`, offsetX + padL + 6, yCursor);
  yCursor += lineH;

  // Greenhouse excess
  const excessColor = excess > 0 ? '#f7768e' : '#9ece6a';
  ctx.fillStyle = excessColor;
  ctx.font = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`GH excess = +${Math.round(excess)} K`, offsetX + padL, yCursor);
  yCursor += lineH + 8;

  // ---- Comparison bar chart -----------------------------------------------
  const chartL = offsetX + padL;
  const chartR = offsetX + W - padR;
  const chartW = chartR - chartL;

  const comparisons = [
    { label: 'Earth (obs)', T: 288,           color: '#9ece6a' },
    { label: 'Venus (obs)', T: 735,           color: '#f7768e' },
    { label: `This model`,  T: tsK,           color: '#ffd166' },
  ];

  const Tmax   = 800;
  const barH   = 22;
  const barGap = 10;

  ctx.fillStyle = '#8b949e';
  ctx.font = 'bold 12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Comparison', chartL, yCursor);
  yCursor += 18;

  comparisons.forEach(({ label, T, color }) => {
    const bW = (Math.min(T, Tmax) / Tmax) * chartW;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.30;
    ctx.fillRect(chartL, yCursor, bW, barH);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(chartL, yCursor, bW, barH);

    ctx.fillStyle = '#e6edf3';
    ctx.font = '12px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label}: ${Math.round(T)} K`, chartL + 6, yCursor + barH / 2);

    yCursor += barH + barGap;
  });

  // Scale label
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`← 0 K`, chartL + 2, yCursor + 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${Tmax} K →`, chartR, yCursor + 2);

  yCursor += 24;

  // Note about optical depth
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const note = N === 0
    ? '\u03C4 \u226A 1  (optically thin — no GH warming)'
    : N <= 2
    ? '\u03C4 ~ 1–few  (moderate greenhouse)'
    : '\u03C4 \u226B 1  (optically thick — strong warming)';
  ctx.fillText(note, chartL, yCursor);
  yCursor += 18;

  if (N >= 1) {
    ctx.fillStyle = '#7aa2f7';
    ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    ctx.fillText('(2\u00D7CO\u2082 \u2248 +3.7 W/m\u00B2 forcing \u2248 1\u20132 K)', chartL, yCursor);
  }
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------
function drawDivider(x, H) {
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, 10);
  ctx.lineTo(x, H - 10);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main draw
// ---------------------------------------------------------------------------
function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const splitX  = 480;
  const rightW  = W - splitX - 6;

  drawLayerDiagram(splitX, H);
  drawDivider(splitX + 3, H);
  drawReadout(splitX + 6, rightW, H);
}

draw();
