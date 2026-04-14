import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ── Physical constants ──────────────────────────────────────────────────────
const k_B = 1.381e-23;   // J/K  Boltzmann
const u   = 1.6605e-27;  // kg   atomic mass unit

// ── Planet data ─────────────────────────────────────────────────────────────
const PLANETS = {
  moon:    { label: 'Moon',    vesc: 2.4  },
  mars:    { label: 'Mars',    vesc: 5.0  },
  venus:   { label: 'Venus',   vesc: 10.4 },
  earth:   { label: 'Earth',   vesc: 11.2 },
  jupiter: { label: 'Jupiter', vesc: 59.5 },
};
// Bar-chart order
const BAR_ORDER = ['moon', 'mars', 'venus', 'earth', 'jupiter'];

// ── DOM elements ────────────────────────────────────────────────────────────
const canvas     = document.getElementById('ae-canvas');
const ctx        = canvas.getContext('2d');
const speciesSel = document.getElementById('species');
const planetSel  = document.getElementById('planet');
const TSlider    = document.getElementById('T-slider');
const TVal       = document.getElementById('T-val');

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Maxwell–Boltzmann f(v) for speed v (m/s) */
function mb(v_ms, m_kg, T) {
  const a = m_kg / (2 * Math.PI * k_B * T);
  return 4 * Math.PI * Math.pow(a, 1.5) * v_ms * v_ms * Math.exp(-m_kg * v_ms * v_ms / (2 * k_B * T));
}

/** Numerical tail fraction P(v > vesc) via trapezoidal rule over n steps */
function tailFraction(vesc_ms, m_kg, T, n = 800) {
  // integrate from vesc to 10 * v_m
  const vm = Math.sqrt(2 * k_B * T / m_kg);
  const vMax = Math.max(vesc_ms * 1.05, 10 * vm);
  if (vesc_ms >= vMax) return 0;
  const dv = (vMax - vesc_ms) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const v = vesc_ms + i * dv;
    const w = (i === 0 || i === n) ? 0.5 : 1.0;
    sum += w * mb(v, m_kg, T);
  }
  return sum * dv;
}

/** Format a fraction as % or sci notation */
function fmtFraction(f) {
  if (f >= 0.001) return (f * 100).toFixed(2) + ' %';
  if (f <= 0)     return '0 %';
  return (f * 100).toExponential(2) + ' %';
}

// ── Layout ───────────────────────────────────────────────────────────────────
const W = canvas.width;
const H = canvas.height;
const PAD = { top: 36, bottom: 56, left: 58, right: 18 };
const SPLIT = Math.floor(W * 0.52);  // left panel width
const BAR_LEFT  = SPLIT + 10;        // right panel x-start

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  fg:      '#e6edf3',
  muted:   '#8b949e',
  accent:  '#7aa2f7',
  accent2: '#bb9af7',
  warm:    '#ffd166',
  good:    '#9ece6a',
  bad:     '#f7768e',
  bg:      '#0d1117',
  panel:   '#161b22',
};

// ── Main draw ────────────────────────────────────────────────────────────────
function draw() {
  const T      = Number(TSlider.value);
  const massU  = Number(speciesSel.value);
  const m_kg   = massU * u;
  const planet = PLANETS[planetSel.value];
  const vesc   = planet.vesc;           // km/s
  const vm     = Math.sqrt(2 * k_B * T / m_kg) / 1000;  // km/s
  const threeVm = 3 * vm;

  TVal.textContent = T;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  drawMBPanel(T, m_kg, vesc, vm, threeVm);
  drawBarPanel(vesc, threeVm, vm);
  drawReadouts(vesc, vm, threeVm, m_kg, T);
}

// ── Left panel: Maxwell-Boltzmann curve ──────────────────────────────────────
function drawMBPanel(T, m_kg, vesc_km, vm_km, threeVm_km) {
  const vm_ms   = vm_km * 1000;
  const vesc_ms = vesc_km * 1000;

  // x-axis: 0 → vMax km/s
  const vMax_km = Math.max(vesc_km * 1.6, threeVm_km * 1.4, 60);
  const vMax_ms = vMax_km * 1000;

  const lx = PAD.left;
  const rx = SPLIT - PAD.right;
  const ty = PAD.top;
  const by = H - PAD.bottom;
  const pw = rx - lx;
  const ph = by - ty;

  // Map helpers
  const xPx = v_km => lx + (v_km / vMax_km) * pw;
  const yPx = f    => by - f * ph;

  // Compute curve points (0 → vMax)
  const N = 400;
  const pts = [];
  let fMax = 0;
  for (let i = 0; i <= N; i++) {
    const v_ms = (i / N) * vMax_ms;
    const f = mb(v_ms, m_kg, T);
    if (f > fMax) fMax = f;
    pts.push({ v: v_ms / 1000, f });
  }

  // normalise f to [0,1] for plotting
  const norm = f => (fMax > 0 ? f / fMax : 0);

  // Shade tail beyond vesc
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xPx(vesc_km), yPx(0));
  for (let i = 0; i <= N; i++) {
    const { v, f } = pts[i];
    if (v >= vesc_km) {
      ctx.lineTo(xPx(v), yPx(norm(f)));
    }
  }
  ctx.lineTo(xPx(vMax_km), yPx(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(247,118,142,0.35)';
  ctx.fill();
  ctx.restore();

  // Curve
  ctx.save();
  ctx.beginPath();
  pts.forEach(({ v, f }, i) => {
    const px = xPx(v);
    const py = yPx(norm(f));
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Axes
  ctx.save();
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, ty); ctx.lineTo(lx, by);
  ctx.moveTo(lx, by); ctx.lineTo(rx, by);
  ctx.stroke();

  // x ticks & labels
  ctx.fillStyle = C.muted;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  const tickStep = vMax_km <= 30 ? 5 : vMax_km <= 60 ? 10 : 20;
  for (let v = 0; v <= vMax_km; v += tickStep) {
    const px = xPx(v);
    ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px, by + 5); ctx.stroke();
    ctx.fillText(v, px, by + 17);
  }
  ctx.fillStyle = C.muted;
  ctx.font = '12px sans-serif';
  ctx.fillText('v  (km/s)', lx + pw / 2, by + 36);

  // y axis label
  ctx.save();
  ctx.translate(lx - 44, ty + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = C.muted;
  ctx.fillText('f(v)  [a.u.]', 0, 0);
  ctx.restore();
  ctx.restore();

  // Dashed lines
  const dashLine = (v_km, color, label) => {
    const px = xPx(v_km);
    if (px < lx || px > rx) return;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, ty); ctx.lineTo(px, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, px, ty - 6);
    ctx.restore();
  };

  dashLine(vesc_km, C.bad,    'v_esc');
  dashLine(vm_km,   C.accent2, 'v_m');

  // Panel title
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Maxwell–Boltzmann Distribution', lx, ty - 14);
}

// ── Right panel: bar chart ───────────────────────────────────────────────────
function drawBarPanel(vesc_selected_km, threeVm_km, vm_km) {
  const lx = BAR_LEFT + PAD.left - 10;
  const rx = W - PAD.right - 10;
  const ty = PAD.top;
  const by = H - PAD.bottom;
  const pw = rx - lx;
  const ph = by - ty;

  const maxV = 65;  // km/s axis max
  const xPx = v => lx + (v / maxV) * pw;

  // Panel title
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('v_esc vs 3·v_m  by planet', lx, ty - 14);

  // Axis
  ctx.save();
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, by); ctx.lineTo(rx, by);
  ctx.stroke();

  // x ticks
  ctx.fillStyle = C.muted;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let v = 0; v <= maxV; v += 10) {
    const px = xPx(v);
    ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px, by + 5); ctx.stroke();
    ctx.fillText(v, px, by + 17);
  }
  ctx.fillStyle = C.muted;
  ctx.font = '12px sans-serif';
  ctx.fillText('v_esc  (km/s)', lx + pw / 2, by + 36);
  ctx.restore();

  // Bars
  const nPlanets = BAR_ORDER.length;
  const barH = Math.floor((ph - 20) / nPlanets) - 6;
  const barY = i => ty + 10 + i * (barH + 6);

  BAR_ORDER.forEach((key, i) => {
    const p = PLANETS[key];
    const bx = lx;
    const bw = Math.max(2, (p.vesc / maxV) * pw);
    const by2 = barY(i);

    // Colour logic
    let color;
    if (p.vesc > threeVm_km * 1.05)       color = C.good;
    else if (p.vesc < threeVm_km * 0.95)  color = C.bad;
    else                                   color = C.warm;

    // Bar fill
    ctx.save();
    ctx.fillStyle = color + '99';
    ctx.fillRect(bx, by2, bw, barH);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by2, bw, barH);

    // Label
    ctx.fillStyle = C.fg;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${p.label}  ${p.vesc} km/s`, bx + bw + 6, by2 + barH / 2 + 4);
    ctx.restore();
  });

  // 3·v_m vertical rule
  const tvx = xPx(threeVm_km);
  if (tvx >= lx && tvx <= rx) {
    ctx.save();
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = C.warm;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tvx, ty + 4);
    ctx.lineTo(tvx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = C.warm;
    ctx.textAlign = 'center';
    ctx.fillText('3·v_m', tvx, ty - 6);
    ctx.restore();
  }
}

// ── Readout text (bottom bar) ────────────────────────────────────────────────
function drawReadouts(vesc, vm, threeVm, m_kg, T) {
  const fraction = tailFraction(vesc * 1000, m_kg, T);

  let verdict, vColor;
  if (vesc < threeVm * 0.95) {
    verdict = 'ESCAPES'; vColor = C.bad;
  } else if (vesc > threeVm * 1.05) {
    verdict = 'RETAINED'; vColor = C.good;
  } else {
    verdict = 'LEAKS SLOWLY'; vColor = C.warm;
  }

  const readouts = [
    `v_esc = ${vesc.toFixed(1)} km/s`,
    `v_m = ${vm.toFixed(2)} km/s`,
    `3·v_m = ${threeVm.toFixed(2)} km/s`,
    `tail fraction = ${fmtFraction(fraction)}`,
  ];

  const ry = H - 10;
  ctx.save();
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';

  let x = PAD.left;
  readouts.forEach(txt => {
    ctx.fillStyle = C.muted;
    ctx.fillText(txt, x, ry);
    x += ctx.measureText(txt).width + 24;
  });

  // Verdict
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = vColor;
  ctx.textAlign = 'right';
  ctx.fillText(verdict, W - PAD.right - 10, ry);
  ctx.restore();
}

// ── Event listeners ──────────────────────────────────────────────────────────
TSlider.addEventListener('input', draw);
speciesSel.addEventListener('change', draw);
planetSel.addEventListener('change', draw);

// Initial render
draw();
