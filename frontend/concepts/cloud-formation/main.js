import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ── Constants ────────────────────────────────────────────────────────────────
const R = 8.314; // J/(mol·K)

// ── Species definitions ───────────────────────────────────────────────────────
// P_sat(T) = P_ref * exp( -(L*M/R) * (1/T - 1/T_ref) )
// H2SO4 uses a phenomenological form: P_ref=1 bar at T_ref=600 K with
// an effective L*M/R chosen so the curve is plausible (steep).
const SPECIES = [
  {
    id: 'h2o',
    label: 'H\u2082O',
    color: '#7aa2f7',
    L: 2.26e6,   // J/kg
    M: 0.018,    // kg/mol
    Tref: 273,   // K
    Pref: 0.006, // bar
  },
  {
    id: 'co2',
    label: 'CO\u2082',
    color: '#ffd166',
    L: 5.73e5,
    M: 0.044,
    Tref: 216.6,
    Pref: 5.18,  // bar (CO2 triple point ≈ 5.18 bar, 216.6 K)
  },
  {
    id: 'nh3',
    label: 'NH\u2083',
    color: '#bb9af7',
    L: 1.37e6,
    M: 0.017,
    Tref: 195,   // K (boiling near 239 K, but sublimation ref)
    Pref: 0.006, // bar (approx at 195 K)
  },
  {
    id: 'ch4',
    label: 'CH\u2084',
    color: '#9ece6a',
    L: 5.1e5,
    M: 0.016,
    Tref: 112,   // K (near boiling point)
    Pref: 1.013, // bar
  },
  {
    id: 'h2so4',
    label: 'H\u2082SO\u2084',
    color: '#f7768e',
    // Phenomenological: set so 1 bar @ 600 K and steep slope
    L: 4.2e5,    // effective J/kg (gives reasonable curve)
    M: 0.098,    // kg/mol
    Tref: 600,
    Pref: 1.0,
  },
];

// ── Planet profiles ───────────────────────────────────────────────────────────
// Each profile is a straight line in log-log (T, log10 P) space
// from surface point to top point.
const PLANETS = {
  earth: {
    name: 'Earth',
    surface: { T: 288, P: 1.0 },
    top:     { T: 220, P: 0.1 },
  },
  venus: {
    name: 'Venus',
    surface: { T: 735, P: 92.0 },
    top:     { T: 230, P: 0.01 },
  },
  mars: {
    name: 'Mars',
    surface: { T: 210, P: 0.006 },
    top:     { T: 140, P: 1e-4 },
  },
  jupiter: {
    name: 'Jupiter',
    surface: { T: 165, P: 1.0 },
    top:     { T: 110, P: 0.1 },
  },
  titan: {
    name: 'Titan',
    surface: { T: 94,  P: 1.5 },
    top:     { T: 70,  P: 0.01 },
  },
};

// ── Saturation pressure formula ───────────────────────────────────────────────
function pSat(sp, T) {
  const exponent = -(sp.L * sp.M / R) * (1 / T - 1 / sp.Tref);
  return sp.Pref * Math.exp(exponent);
}

// ── Canvas & layout ───────────────────────────────────────────────────────────
const canvas = document.getElementById('cf-canvas');
const ctx    = canvas.getContext('2d');
const W      = canvas.width;
const H      = canvas.height;

// Axis ranges (log scale for both)
const T_MIN  = 50;    // K
const T_MAX  = 1000;  // K
const P_MIN  = 1e-6;  // bar
const P_MAX  = 1e3;   // bar

const PAD = { top: 40, bottom: 54, left: 70, right: 230 };
const PLOT = {
  x: PAD.left,
  y: PAD.top,
  w: W - PAD.left - PAD.right,
  h: H - PAD.top - PAD.bottom,
};

// ── Coordinate helpers ────────────────────────────────────────────────────────
function tToX(T) {
  const lMin = Math.log10(T_MIN);
  const lMax = Math.log10(T_MAX);
  return PLOT.x + ((Math.log10(T) - lMin) / (lMax - lMin)) * PLOT.w;
}

function pToY(P) {
  const lMin = Math.log10(P_MIN);
  const lMax = Math.log10(P_MAX);
  return PLOT.y + PLOT.h - ((Math.log10(P) - lMin) / (lMax - lMin)) * PLOT.h;
}

// Inverse: canvas x -> T
function xToT(x) {
  const lMin = Math.log10(T_MIN);
  const lMax = Math.log10(T_MAX);
  return Math.pow(10, lMin + ((x - PLOT.x) / PLOT.w) * (lMax - lMin));
}

// ── Grid & axes ───────────────────────────────────────────────────────────────
function drawAxes() {
  ctx.save();
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  ctx.fillStyle   = '#8b949e';
  ctx.font        = '11px monospace';

  // Grid lines – temperature decades
  const tDecades = [50, 100, 200, 300, 500, 700, 1000];
  tDecades.forEach(T => {
    const x = tToX(T);
    ctx.beginPath();
    ctx.strokeStyle = '#21262d';
    ctx.moveTo(x, PLOT.y);
    ctx.lineTo(x, PLOT.y + PLOT.h);
    ctx.stroke();
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.fillText(T + ' K', x, PLOT.y + PLOT.h + 16);
  });

  // Grid lines – pressure decades
  const pVals = [1e-6, 1e-5, 1e-4, 1e-3, 0.01, 0.1, 1, 10, 100, 1000];
  const pLabels = ['10⁻⁶','10⁻⁵','10⁻⁴','10⁻³','10⁻²','10⁻¹','1','10','10²','10³'];
  pVals.forEach((P, i) => {
    const y = pToY(P);
    ctx.beginPath();
    ctx.strokeStyle = '#21262d';
    ctx.moveTo(PLOT.x, y);
    ctx.lineTo(PLOT.x + PLOT.w, y);
    ctx.stroke();
    ctx.fillStyle   = '#8b949e';
    ctx.textAlign   = 'right';
    ctx.fillText(pLabels[i], PLOT.x - 6, y + 4);
  });

  // Border
  ctx.strokeStyle = '#3d4451';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(PLOT.x, PLOT.y, PLOT.w, PLOT.h);

  // Axis labels
  ctx.fillStyle = '#e6edf3';
  ctx.font      = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Temperature (K)', PLOT.x + PLOT.w / 2, PLOT.y + PLOT.h + 38);

  ctx.save();
  ctx.translate(14, PLOT.y + PLOT.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Vapor Pressure (bar)', 0, 0);
  ctx.restore();

  ctx.restore();
}

// ── Saturation curves ─────────────────────────────────────────────────────────
function drawSaturationCurves() {
  const steps = 400;
  const lTmin = Math.log10(T_MIN);
  const lTmax = Math.log10(T_MAX);

  SPECIES.forEach(sp => {
    ctx.beginPath();
    ctx.strokeStyle = sp.color;
    ctx.lineWidth   = 2;
    let penDown = false;

    for (let i = 0; i <= steps; i++) {
      const lT = lTmin + (i / steps) * (lTmax - lTmin);
      const T  = Math.pow(10, lT);
      const P  = pSat(sp, T);
      if (P < P_MIN || P > P_MAX || !isFinite(P)) { penDown = false; continue; }
      const x = tToX(T);
      const y = pToY(P);
      if (y < PLOT.y - 2 || y > PLOT.y + PLOT.h + 2) { penDown = false; continue; }
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

// ── Profile line interpolation ────────────────────────────────────────────────
// Returns (T, P) for fraction t in [0,1] along the profile (log-log interp)
function profilePoint(planet, t) {
  const s = planet.surface;
  const top = planet.top;
  const lT = Math.log10(s.T) + t * (Math.log10(top.T) - Math.log10(s.T));
  const lP = Math.log10(s.P) + t * (Math.log10(top.P) - Math.log10(s.P));
  return { T: Math.pow(10, lT), P: Math.pow(10, lP) };
}

// ── Find crossings ────────────────────────────────────────────────────────────
function findCrossings(planet) {
  const crossings = [];
  const STEPS = 2000;

  SPECIES.forEach(sp => {
    let prevSign = null;
    let prevT = null, prevP = null, prevFrac = null;

    for (let i = 0; i <= STEPS; i++) {
      const frac = i / STEPS;
      const pt   = profilePoint(planet, frac);
      const sat  = pSat(sp, pt.T);
      if (!isFinite(sat) || sat <= 0) { prevSign = null; continue; }
      const diff  = Math.log10(pt.P) - Math.log10(sat); // >0 means P > Psat → condensed
      const sign  = Math.sign(diff);

      if (prevSign !== null && sign !== 0 && prevSign !== sign) {
        // Linear interpolation to find crossing
        const frac0 = prevFrac, frac1 = frac;
        const pt0 = profilePoint(planet, frac0);
        const pt1 = profilePoint(planet, frac1);
        const sat0 = pSat(sp, pt0.T);
        const sat1 = pSat(sp, pt1.T);
        if (!isFinite(sat0) || !isFinite(sat1)) { prevSign = sign; prevT = pt.T; prevP = pt.P; prevFrac = frac; continue; }
        const d0 = Math.log10(pt0.P) - Math.log10(sat0);
        const d1 = Math.log10(pt1.P) - Math.log10(sat1);
        const alpha = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1));
        const crossFrac = frac0 + alpha * (frac1 - frac0);
        const crossPt   = profilePoint(planet, crossFrac);
        crossings.push({ species: sp, T: crossPt.T, P: crossPt.P, sign: sign });
      }

      prevSign = sign; prevT = pt.T; prevP = pt.P; prevFrac = frac;
    }
  });

  return crossings;
}

// ── Draw atmospheric profile ──────────────────────────────────────────────────
function drawProfile(planet) {
  const STEPS = 200;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(230,237,243,0.85)';
  ctx.lineWidth   = 3;
  ctx.setLineDash([]);

  for (let i = 0; i <= STEPS; i++) {
    const pt = profilePoint(planet, i / STEPS);
    const x  = tToX(pt.T);
    const y  = pToY(pt.P);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Surface dot
  const sx = tToX(planet.surface.T);
  const sy = pToY(planet.surface.P);
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#e6edf3';
  ctx.fill();
}

// ── Draw cloud-deck markers ───────────────────────────────────────────────────
function drawStar(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  const spikes = 5;
  const outerR = r, innerR = r * 0.45;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawCrossings(crossings) {
  crossings.forEach(c => {
    const x = tToX(c.T);
    const y = pToY(c.P);
    if (x < PLOT.x || x > PLOT.x + PLOT.w || y < PLOT.y || y > PLOT.y + PLOT.h) return;
    drawStar(x, y, 8, '#ffd166');
  });
}

// ── Right panel readout ───────────────────────────────────────────────────────
function drawReadout(planet, crossings) {
  const rx = PLOT.x + PLOT.w + 18;
  const ry = PLOT.y;
  const rw = PAD.right - 22;

  // Planet name
  ctx.fillStyle = '#e6edf3';
  ctx.font      = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(planet.name, rx, ry + 16);

  ctx.font      = '11px sans-serif';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('Cloud decks:', rx, ry + 34);

  if (crossings.length === 0) {
    ctx.fillStyle = '#8b949e';
    ctx.fillText('none detected', rx, ry + 52);
  } else {
    let lineY = ry + 52;
    crossings.forEach(c => {
      const Tfmt = c.T.toFixed(0) + ' K';
      const Pfmt = c.P < 0.01 ? c.P.toExponential(1) : c.P.toFixed(4);

      // Species color swatch
      ctx.fillStyle = c.species.color;
      ctx.fillRect(rx, lineY - 9, 10, 10);

      ctx.fillStyle = c.species.color;
      ctx.font      = 'bold 11px monospace';
      ctx.fillText(c.species.label, rx + 14, lineY);

      ctx.font      = '10px monospace';
      ctx.fillStyle = '#e6edf3';
      ctx.fillText(Tfmt + ' / ' + Pfmt + ' bar', rx, lineY + 13);

      lineY += 32;
    });
  }

  // Legend – all species
  const legY0 = ry + PLOT.h - SPECIES.length * 18 - 10;
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('Saturation curves:', rx, legY0 - 4);
  SPECIES.forEach((sp, i) => {
    const ly = legY0 + i * 18;
    ctx.strokeStyle = sp.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ly + 1);
    ctx.lineTo(rx + 22, ly + 1);
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(sp.label, rx + 26, ly + 5);
  });
}

// ── Main draw ─────────────────────────────────────────────────────────────────
let activePlanet = PLANETS.earth;

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  drawAxes();
  drawSaturationCurves();
  drawProfile(activePlanet);
  const crossings = findCrossings(activePlanet);
  drawCrossings(crossings);
  drawReadout(activePlanet, crossings);
}

// ── Preset buttons ────────────────────────────────────────────────────────────
const buttons = {
  'btn-earth':   'earth',
  'btn-venus':   'venus',
  'btn-mars':    'mars',
  'btn-jupiter': 'jupiter',
  'btn-titan':   'titan',
};

Object.entries(buttons).forEach(([id, key]) => {
  document.getElementById(id).addEventListener('click', () => {
    activePlanet = PLANETS[key];
    document.querySelectorAll('#planet-buttons button').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    draw();
  });
});

// ── Initial render ────────────────────────────────────────────────────────────
draw();
