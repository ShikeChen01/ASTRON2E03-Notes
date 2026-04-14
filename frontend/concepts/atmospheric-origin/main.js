import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// Canvas + state
// ---------------------------------------------------------------------------
const canvas = document.getElementById('ao-canvas');
const ctx    = canvas.getContext('2d');

let activeQty  = 'co2';
let showUrey   = false;

// ---------------------------------------------------------------------------
// Data: Venus, Earth, Mars
// ---------------------------------------------------------------------------
const PLANETS = [
  { name: 'Venus', color: '#f7768e', circle: '#f7768e' },
  { name: 'Earth', color: '#9ece6a', circle: '#9ece6a' },
  { name: 'Mars',  color: '#7aa2f7', circle: '#7aa2f7' },
];

// Each quantity: { label, unit, logMin, logMax, values[3], annotations[3], interp }
const QUANTITIES = {
  co2: {
    label: 'Atmospheric CO\u2082 pressure',
    unit: 'bar',
    logMin: -4,
    logMax: 2,
    values: [92, 4e-4, 0.006],          // Venus, Earth, Mars
    annotations: ['92 bar', '4\u00D710\u207B\u2074 bar', '6\u00D710\u207B\u00B3 bar'],
    interp: "Venus's 92\u202Fbar CO\u2082 is what Earth's atmosphere would look like without the Urey cycle locking carbon into carbonate rocks. Earth and Mars outgassed similar CO\u2082 budgets; Earth's liquid water sequestered almost all of it.",
  },
  n2: {
    label: 'Atmospheric N\u2082 fraction',
    unit: '%',
    logMin: -2,
    logMax: 2,
    values: [3.5, 78, 2.7],
    annotations: ['3.5\u202F%', '78\u202F%', '2.7\u202F%'],
    interp: 'Earth\u2019s nitrogen-dominated atmosphere (78\u202F%) contrasts with Venus (3.5\u202F%) and Mars (2.7\u202F%). N\u2082 is chemically inert and difficult to escape, so its abundance reflects the planet\u2019s total volatile inventory and loss history.',
  },
  h2o: {
    label: 'H\u2082O inventory (m ocean equiv.)',
    unit: 'm',
    logMin: -3,
    logMax: 4,
    values: [1e-3, 3000, 5],
    annotations: ['~trace', '~3000\u202Fm', '~5\u202Fm (subsurface ice)'],
    interp: 'Earth holds roughly 3000\u202Fm of ocean. Venus lost its water early \u2014 UV photodissociation split H\u2082O; H escaped, leaving an arid world. Mars lost most surface water by ~3.5\u202FGa; ice may persist in the subsurface.',
  },
  dh: {
    label: 'D/H ratio (\u00D7 Earth standard)',
    unit: '\u00D7 Earth',
    logMin: -1,
    logMax: 3,
    values: [150, 1, 5],
    annotations: ['~150\u00D7', '1\u00D7 (standard)', '~5\u00D7'],
    interp: 'Venus\u2019s D/H ratio is ~150\u00D7 Earth\u2019s SMOW value. UV photolysis of water releases H preferentially; lighter H escapes to space, enriching the residual atmosphere in deuterium. The higher the ratio, the more water was lost.',
  },
  ar: {
    label: '\u2074\u2070Ar / \u00B3\u2076Ar ratio (outgassing proxy)',
    unit: 'ratio',
    logMin: -1,
    logMax: 5,
    values: [1.15, 295, 3000],           // Venus ~1.15, Earth ~295, Mars ~3000 (high Ar40 from K decay, less primordial 36Ar)
    annotations: ['~1.15', '~295', '~3000'],
    interp: '\u2074\u2070Ar is radiogenic (from \u2074\u2070K decay in the crust/mantle) while \u00B3\u2076Ar is primordial. A high \u2074\u2070Ar/\u00B3\u2076Ar ratio indicates efficient outgassing of radiogenic argon. Mars\u2019s high ratio reflects intense early volcanism with little primordial \u00B3\u2076Ar retained.',
  },
};

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------
document.querySelectorAll('.qty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.qty-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeQty = btn.dataset.qty;
    draw();
  });
});

document.getElementById('urey-toggle').addEventListener('click', () => {
  showUrey = !showUrey;
  document.getElementById('urey-toggle').textContent =
    showUrey ? 'Hide Urey cycle' : 'Show Urey cycle';
  draw();
});

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function drawArrow(x1, y1, x2, y2, color, lw = 1.5, hs = 7) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = lw;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * hs, y2 - uy * hs);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * hs - px * (hs * 0.5), y2 - uy * hs - py * (hs * 0.5));
  ctx.lineTo(x2 - ux * hs + px * (hs * 0.5), y2 - uy * hs + py * (hs * 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY + lineH;
}

// ---------------------------------------------------------------------------
// Planet icons (header row)
// ---------------------------------------------------------------------------
function drawPlanetIcons(cols, headerY) {
  PLANETS.forEach((p, i) => {
    const cx = cols[i];
    const cy = headerY;

    // Glow
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 22);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Circle
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.name, cx, cy + 20);
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------
// Bar chart rows
// ---------------------------------------------------------------------------
function drawBars(cols, barY, qty) {
  const BAR_H   = 26;
  const colW    = 180;
  const halfW   = colW * 0.5;

  const { values, annotations, logMin, logMax } = qty;

  PLANETS.forEach((p, i) => {
    const cx  = cols[i];
    const raw = values[i];
    // log-normalise: fraction 0..1
    const logVal  = Math.log10(Math.max(raw, Math.pow(10, logMin)));
    const frac    = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));
    const barW    = Math.max(frac * (colW - 10), 2);

    const bx = cx - halfW + 5;
    const by = barY;

    // Bar fill
    ctx.save();
    ctx.fillStyle   = p.color;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(bx, by, barW, BAR_H);
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = p.color;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(bx, by, barW, BAR_H);
    ctx.restore();

    // Annotation
    ctx.save();
    ctx.fillStyle    = '#e6edf3';
    ctx.font         = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    const annX = bx + barW + 4;
    const annY = by + BAR_H / 2;
    // If bar is very narrow, place text after bar; if wide, overlay
    ctx.fillText(annotations[i], annX > cx + halfW - 40 ? bx + 4 : annX, annY);
    ctx.restore();
  });

  return barY + BAR_H + 8;
}

// ---------------------------------------------------------------------------
// Urey cycle overlay
// ---------------------------------------------------------------------------
function drawUreyCycle(x, y, w, h) {
  // Background card
  ctx.save();
  ctx.fillStyle   = '#161b22';
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#bb9af7';
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle    = '#bb9af7';
  ctx.font         = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Carbonate-Silicate (Urey) Cycle', x + w / 2, y + 10);
  ctx.restore();

  // Node positions
  const nodes = [
    { label: 'Atmospheric CO\u2082',         nx: x + w * 0.5,  ny: y + 50  },
    { label: 'Rain + weathering',            nx: x + w * 0.15, ny: y + 110 },
    { label: 'Carbonate rock\n(CO\u2082 locked)', nx: x + w * 0.5, ny: y + 165 },
    { label: 'Subduction\n& volcanism',      nx: x + w * 0.85, ny: y + 110 },
  ];

  // Draw nodes
  nodes.forEach(n => {
    ctx.save();
    ctx.fillStyle    = '#21262d';
    ctx.strokeStyle  = '#8b949e';
    ctx.lineWidth    = 1;
    ctx.beginPath();
    ctx.roundRect(n.nx - 58, n.ny - 16, 116, 32, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle    = '#e6edf3';
    ctx.font         = '10px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const lines = n.label.split('\n');
    lines.forEach((ln, li) => {
      ctx.fillText(ln, n.nx, n.ny + (li - (lines.length - 1) / 2) * 13);
    });
    ctx.restore();
  });

  // Arrows between nodes
  const arrowColor = '#bb9af7';
  // CO2 → Rain
  drawArrow(nodes[0].nx - 40, nodes[0].ny + 16, nodes[1].nx + 30, nodes[1].ny - 16, arrowColor);
  // Rain → Carbonate
  drawArrow(nodes[1].nx + 30, nodes[1].ny + 16, nodes[2].nx - 50, nodes[2].ny - 16, arrowColor);
  // Carbonate → Subduction
  drawArrow(nodes[2].nx + 50, nodes[2].ny - 16, nodes[3].nx - 30, nodes[3].ny + 16, arrowColor);
  // Subduction → CO2 (volcanism)
  drawArrow(nodes[3].nx - 30, nodes[3].ny - 16, nodes[0].nx + 40, nodes[0].ny + 16, arrowColor);

  // Earth/Venus labels
  ctx.save();
  ctx.font         = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = '#9ece6a';
  ctx.fillText('\u2713 Earth (cycle active)', x + w * 0.28, y + h - 28);
  ctx.fillStyle    = '#f7768e';
  ctx.fillText('\u2717 Venus (no liquid H\u2082O \u2192 cycle stalled)', x + w * 0.72, y + h - 28);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Interpretive text
// ---------------------------------------------------------------------------
function drawInterpText(x, y, w, text) {
  ctx.save();
  ctx.fillStyle    = '#8b949e';
  ctx.font         = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  wrapText(text, x, y, w, 17);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main draw
// ---------------------------------------------------------------------------
function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const colW      = 180;
  const leftPad   = 60;
  const cols      = [
    leftPad + colW * 0.5,
    leftPad + colW * 1.5,
    leftPad + colW * 2.5,
  ]; // centre-x of each planet column

  const headerY = 30;

  // Planet icons + names
  drawPlanetIcons(cols, headerY);

  const qty = QUANTITIES[activeQty];

  // Quantity title row
  const titleY = headerY + 44;
  ctx.save();
  ctx.fillStyle    = '#ffd166';
  ctx.font         = 'bold 13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(qty.label + (qty.unit !== '' ? '  [' + qty.unit + ']' : ''), leftPad, titleY);
  ctx.restore();

  // Axis label: log scale hint
  ctx.save();
  ctx.fillStyle    = '#8b949e';
  ctx.font         = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('(log scale)', leftPad, titleY + 16);
  ctx.restore();

  // Bars
  const barsY = titleY + 36;
  drawBars(cols, barsY, qty);

  // Interpretive text block
  const interpX = leftPad;
  const interpY = barsY + 50;
  const interpW = cols[2] + colW * 0.5 - leftPad;
  drawInterpText(interpX, interpY, interpW, qty.interp);

  // Vertical column separators (subtle)
  ctx.save();
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  [1, 2].forEach(i => {
    const sx = leftPad + colW * i;
    ctx.beginPath();
    ctx.moveTo(sx, 10);
    ctx.lineTo(sx, interpY - 8);
    ctx.stroke();
  });
  ctx.restore();

  // Noble-gas fingerprint key (right margin)
  const keyX = cols[2] + colW * 0.5 + 20;
  const keyY = 20;
  const keyW = W - keyX - 10;

  if (keyW > 60) {
    ctx.save();
    ctx.fillStyle    = '#8b949e';
    ctx.font         = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Isotopic forensics', keyX, keyY);

    const items = [
      { label: 'D/H \u2191',  desc: 'water loss' },
      { label: '\u00B3\u2076Ar', desc: 'primordial gas' },
      { label: '\u2074\u2070Ar', desc: 'K-decay / outgas' },
      { label: '\u00B2\u00B2Ne/\u00B2\u2070Ne', desc: 'nebular vs. cometary' },
    ];
    ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    items.forEach((it, idx) => {
      const ky = keyY + 20 + idx * 28;
      ctx.fillStyle = '#7aa2f7';
      ctx.fillText(it.label, keyX, ky);
      ctx.fillStyle = '#8b949e';
      ctx.fillText(it.desc, keyX, ky + 13);
    });
    ctx.restore();

    // Atmosphere source legend
    const srcY = keyY + 140;
    ctx.save();
    ctx.fillStyle = '#8b949e';
    ctx.font      = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Atm. sources', keyX, srcY);
    const sources = [
      { color: '#bb9af7', text: 'Outgassing' },
      { color: '#ffd166', text: 'Late delivery' },
      { color: '#7aa2f7', text: 'Primordial (giants only)' },
    ];
    ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    sources.forEach((s, idx) => {
      const sy = srcY + 18 + idx * 22;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(keyX + 5, sy + 5, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#8b949e';
      ctx.fillText(s.text, keyX + 14, sy);
    });
    ctx.restore();
  }

  // Urey cycle overlay
  if (showUrey) {
    const uw = Math.min(560, W - 40);
    const uh = 210;
    const ux = (W - uw) / 2;
    const uy = H - uh - 10;
    drawUreyCycle(ux, uy, uw, uh);
  } else {
    // Surface pressure comparison mini-bar at bottom when Urey hidden
    const spY    = H - 60;
    const spW    = cols[2] + colW * 0.5 - leftPad;
    ctx.save();
    ctx.fillStyle    = '#8b949e';
    ctx.font         = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Surface pressure:  Venus 92\u202Fbar   Earth 1\u202Fbar   Mars 0.006\u202Fbar', leftPad, spY);
    ctx.fillStyle = '#7aa2f7';
    ctx.font      = '10px -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Toggle \u201CShow Urey cycle\u201D to see the carbonate-silicate loop', leftPad, spY + 16);
    ctx.restore();
  }
}

draw();
