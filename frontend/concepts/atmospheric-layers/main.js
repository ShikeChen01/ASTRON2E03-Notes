import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';
injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// Planet profiles
// ---------------------------------------------------------------------------

// Each profile entry: { name, yLabel, yUnit, useLogP, layers, pauses, profile, readout }
// profile: array of [T_K, alt] pairs — alt is km for non-Jupiter, bar for Jupiter
// layers: array of { name, color, yMin, yMax } — bounds in same units as profile alt
// pauses: array of { name, y } — horizontal lines in same units

const PLANETS = {
  Earth: {
    name: 'Earth',
    yLabel: 'Altitude (km)',
    yUnit: 'km',
    useLogP: false,
    yMin: 0,
    yMax: 130,
    tMin: 150,
    tMax: 1050,
    profile: [
      [288, 0],
      [217, 11],
      [217, 20],
      [271, 50],
      [187, 85],
      [300, 120],
      [1000, 500],
    ],
    layers: [
      { name: 'Troposphere',  color: 'rgba(122,162,247,0.18)', yMin: 0,   yMax: 11  },
      { name: 'Stratosphere', color: 'rgba(255,209,102,0.18)', yMin: 11,  yMax: 50  },
      { name: 'Mesosphere',   color: 'rgba(187,154,247,0.18)', yMin: 50,  yMax: 85  },
      { name: 'Thermosphere', color: 'rgba(247,118,142,0.18)', yMin: 85,  yMax: 130 },
    ],
    pauses: [
      { name: 'tropopause',   y: 11  },
      { name: 'stratopause',  y: 50  },
      { name: 'mesopause',    y: 85  },
    ],
    readout: {
      surfaceT: 288,
      surfaceLabel: 'Surface T',
      tropopauseT: 217,
      tropopauseZ: 11,
      thermoT: 1000,
      thermoLabel: 'Thermosphere peak T',
    },
  },

  Mars: {
    name: 'Mars',
    yLabel: 'Altitude (km)',
    yUnit: 'km',
    useLogP: false,
    yMin: 0,
    yMax: 130,
    tMin: 100,
    tMax: 250,
    profile: [
      [210, 0],
      [130, 45],
      [130, 80],
      [200, 120],
    ],
    layers: [
      { name: 'Troposphere',  color: 'rgba(122,162,247,0.18)', yMin: 0,  yMax: 45  },
      { name: 'Thermosphere', color: 'rgba(247,118,142,0.18)', yMin: 45, yMax: 130 },
    ],
    pauses: [
      { name: 'tropopause', y: 45 },
    ],
    readout: {
      surfaceT: 210,
      surfaceLabel: 'Surface T',
      tropopauseT: 130,
      tropopauseZ: 45,
      thermoT: 200,
      thermoLabel: 'Upper atmosphere T',
    },
  },

  Venus: {
    name: 'Venus',
    yLabel: 'Altitude (km)',
    yUnit: 'km',
    useLogP: false,
    yMin: 0,
    yMax: 140,
    tMin: 150,
    tMax: 780,
    profile: [
      [735, 0],
      [430, 30],
      [260, 60],
      [175, 90],
      [300, 130],
    ],
    layers: [
      { name: 'Troposphere',  color: 'rgba(122,162,247,0.18)', yMin: 0,  yMax: 60  },
      { name: 'Mesosphere',   color: 'rgba(187,154,247,0.18)', yMin: 60, yMax: 90  },
      { name: 'Thermosphere', color: 'rgba(247,118,142,0.18)', yMin: 90, yMax: 140 },
    ],
    pauses: [
      { name: 'tropopause', y: 60 },
      { name: 'mesopause',  y: 90 },
    ],
    readout: {
      surfaceT: 735,
      surfaceLabel: 'Surface T',
      tropopauseT: 260,
      tropopauseZ: 60,
      thermoT: 300,
      thermoLabel: 'Thermosphere T',
    },
  },

  Jupiter: {
    name: 'Jupiter',
    yLabel: 'Pressure (bar)',
    yUnit: 'bar',
    useLogP: true,
    // y here is log10(pressure/bar); 1 bar = 0, 0.1 bar = -1, etc.
    // We'll store raw bar values and convert internally
    yMin: 1e-5,
    yMax: 2,
    tMin: 80,
    tMax: 600,
    // profile: [T, pressure_bar]
    profile: [
      [165,  1   ],
      [110,  0.1 ],
      [160,  0.01],
      [500,  1e-4],
    ],
    layers: [
      { name: 'Troposphere',  color: 'rgba(122,162,247,0.18)', pMin: 2,    pMax: 0.1  },
      { name: 'Stratosphere', color: 'rgba(255,209,102,0.18)', pMin: 0.1,  pMax: 0.01 },
      { name: 'Thermosphere', color: 'rgba(247,118,142,0.18)', pMin: 0.01, pMax: 1e-5 },
    ],
    pauses: [
      { name: 'tropopause', p: 0.1 },
    ],
    readout: {
      surfaceT: 165,
      surfaceLabel: '1 bar T',
      tropopauseT: 110,
      tropopauseZ: '0.1 bar',
      thermoT: 500,
      thermoLabel: 'Stratosphere/thermo T',
    },
  },

  Titan: {
    name: 'Titan',
    yLabel: 'Altitude (km)',
    yUnit: 'km',
    useLogP: false,
    yMin: 0,
    yMax: 450,
    tMin: 60,
    tMax: 200,
    profile: [
      [94,  0  ],
      [70,  40 ],
      [170, 200],
      [150, 400],
    ],
    layers: [
      { name: 'Troposphere',  color: 'rgba(122,162,247,0.18)', yMin: 0,   yMax: 40  },
      { name: 'Stratosphere', color: 'rgba(255,209,102,0.18)', yMin: 40,  yMax: 400 },
      { name: 'Thermosphere', color: 'rgba(247,118,142,0.18)', yMin: 400, yMax: 450 },
    ],
    pauses: [
      { name: 'tropopause', y: 40 },
    ],
    readout: {
      surfaceT: 94,
      surfaceLabel: 'Surface T',
      tropopauseT: 70,
      tropopauseZ: 40,
      thermoT: null,
      thermoLabel: null,
    },
  },
};

// ---------------------------------------------------------------------------
// Canvas setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('atm-canvas');
const ctx = canvas.getContext('2d');

const PAD = { top: 30, right: 140, bottom: 60, left: 80 };

let currentPlanet = PLANETS.Earth;

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------
function plotWidth()  { return canvas.width  - PAD.left - PAD.right;  }
function plotHeight() { return canvas.height - PAD.top  - PAD.bottom; }

function tToX(T, tMin, tMax) {
  return PAD.left + ((T - tMin) / (tMax - tMin)) * plotWidth();
}

function yToCanvasLinear(y, yMin, yMax) {
  // y=yMin at bottom, y=yMax at top
  return PAD.top + plotHeight() - ((y - yMin) / (yMax - yMin)) * plotHeight();
}

function yToCanvasLog(p, pMin, pMax) {
  // pressure axis: high pressure at bottom, low at top
  const logMin = Math.log10(pMin);
  const logMax = Math.log10(pMax);
  const logP   = Math.log10(p);
  return PAD.top + ((logP - logMax) / (logMin - logMax)) * plotHeight();
}

function yToCanvas(val, planet) {
  if (planet.useLogP) {
    return yToCanvasLog(val, planet.yMin, planet.yMax);
  }
  return yToCanvasLinear(val, planet.yMin, planet.yMax);
}

// ---------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------
function draw(planet) {
  const W = canvas.width;
  const H = canvas.height;
  const pw = plotWidth();
  const ph = plotHeight();

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const { tMin, tMax } = planet;

  // ---- Layer bands ----
  if (planet.useLogP) {
    for (const layer of planet.layers) {
      const y1 = yToCanvasLog(layer.pMin, planet.yMin, planet.yMax);
      const y2 = yToCanvasLog(layer.pMax, planet.yMin, planet.yMax);
      const yTop    = Math.min(y1, y2);
      const yBottom = Math.max(y1, y2);
      ctx.fillStyle = layer.color;
      ctx.fillRect(PAD.left, yTop, pw, yBottom - yTop);
    }
  } else {
    for (const layer of planet.layers) {
      const y1 = yToCanvasLinear(layer.yMin, planet.yMin, planet.yMax);
      const y2 = yToCanvasLinear(layer.yMax, planet.yMin, planet.yMax);
      ctx.fillStyle = layer.color;
      ctx.fillRect(PAD.left, y2, pw, y1 - y2);
    }
  }

  // ---- Grid lines (T axis) ----
  const tStep = selectStep(tMax - tMin, 6);
  const tStart = Math.ceil(tMin / tStep) * tStep;
  ctx.strokeStyle = 'rgba(139,148,158,0.2)';
  ctx.lineWidth = 1;
  for (let t = tStart; t <= tMax; t += tStep) {
    const x = tToX(t, tMin, tMax);
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + ph);
    ctx.stroke();
  }

  // ---- Grid lines (Y axis) ----
  if (planet.useLogP) {
    const logMin = Math.log10(planet.yMin);
    const logMax = Math.log10(planet.yMax);
    for (let lp = Math.floor(logMin); lp <= Math.ceil(logMax); lp++) {
      const cy = yToCanvasLog(Math.pow(10, lp), planet.yMin, planet.yMax);
      if (cy < PAD.top || cy > PAD.top + ph) continue;
      ctx.beginPath();
      ctx.moveTo(PAD.left, cy);
      ctx.lineTo(PAD.left + pw, cy);
      ctx.stroke();
    }
  } else {
    const yStep = selectStep(planet.yMax - planet.yMin, 6);
    const yStart = Math.ceil(planet.yMin / yStep) * yStep;
    for (let y = yStart; y <= planet.yMax; y += yStep) {
      const cy = yToCanvasLinear(y, planet.yMin, planet.yMax);
      ctx.beginPath();
      ctx.moveTo(PAD.left, cy);
      ctx.lineTo(PAD.left + pw, cy);
      ctx.stroke();
    }
  }

  // ---- Pause lines ----
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(230,237,243,0.45)';
  ctx.lineWidth = 1.2;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#8b949e';
  ctx.textAlign = 'left';

  const pauses = planet.pauses;
  for (const pause of pauses) {
    const cy = planet.useLogP
      ? yToCanvasLog(pause.p, planet.yMin, planet.yMax)
      : yToCanvasLinear(pause.y, planet.yMin, planet.yMax);
    ctx.beginPath();
    ctx.moveTo(PAD.left, cy);
    ctx.lineTo(PAD.left + pw, cy);
    ctx.stroke();
    ctx.fillText(pause.name, PAD.left + 4, cy - 4);
  }
  ctx.setLineDash([]);

  // ---- Layer name labels (right side) ----
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  const layerColors = {
    'Troposphere':  '#7aa2f7',
    'Stratosphere': '#ffd166',
    'Mesosphere':   '#bb9af7',
    'Thermosphere': '#f7768e',
  };

  if (planet.useLogP) {
    for (const layer of planet.layers) {
      const y1 = yToCanvasLog(layer.pMin, planet.yMin, planet.yMax);
      const y2 = yToCanvasLog(layer.pMax, planet.yMin, planet.yMax);
      const midY = (Math.min(y1, y2) + Math.max(y1, y2)) / 2;
      ctx.fillStyle = layerColors[layer.name] || '#e6edf3';
      ctx.fillText(layer.name, PAD.left + pw + 8, midY + 4);
    }
  } else {
    for (const layer of planet.layers) {
      const y1 = yToCanvasLinear(layer.yMin, planet.yMin, planet.yMax);
      const y2 = yToCanvasLinear(layer.yMax, planet.yMin, planet.yMax);
      const midY = (y1 + y2) / 2;
      ctx.fillStyle = layerColors[layer.name] || '#e6edf3';
      ctx.fillText(layer.name, PAD.left + pw + 8, midY + 4);
    }
  }

  // ---- T(z) profile curve ----
  ctx.beginPath();
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < planet.profile.length; i++) {
    const [T, alt] = planet.profile[i];
    const cx = tToX(T, tMin, tMax);
    const cy = yToCanvas(alt, planet);
    if (i === 0) ctx.moveTo(cx, cy);
    else          ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // ---- Axes ----
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1.5;
  // x-axis
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top + ph);
  ctx.lineTo(PAD.left + pw, PAD.top + ph);
  ctx.stroke();
  // y-axis
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + ph);
  ctx.stroke();

  // ---- Axis tick labels ----
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  // T ticks
  for (let t = tStart; t <= tMax; t += tStep) {
    const x = tToX(t, tMin, tMax);
    ctx.fillText(t, x, PAD.top + ph + 18);
  }
  // Y ticks
  ctx.textAlign = 'right';
  if (planet.useLogP) {
    const logMin = Math.log10(planet.yMin);
    const logMax = Math.log10(planet.yMax);
    for (let lp = Math.floor(logMin); lp <= Math.ceil(logMax); lp++) {
      const pVal = Math.pow(10, lp);
      const cy = yToCanvasLog(pVal, planet.yMin, planet.yMax);
      if (cy < PAD.top || cy > PAD.top + ph) continue;
      ctx.fillText(pVal < 0.001 ? pVal.toExponential(0) : pVal, PAD.left - 6, cy + 4);
    }
  } else {
    const yStep = selectStep(planet.yMax - planet.yMin, 6);
    const yStart2 = Math.ceil(planet.yMin / yStep) * yStep;
    for (let y = yStart2; y <= planet.yMax; y += yStep) {
      const cy = yToCanvasLinear(y, planet.yMin, planet.yMax);
      ctx.fillText(y, PAD.left - 6, cy + 4);
    }
  }

  // ---- Axis labels ----
  ctx.fillStyle = '#e6edf3';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Temperature (K)', PAD.left + pw / 2, H - 10);

  ctx.save();
  ctx.translate(16, PAD.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(planet.yLabel, 0, 0);
  ctx.restore();

  // ---- Title ----
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${planet.name} — T(z) Profile`, PAD.left + pw / 2, PAD.top - 8);

  // ---- Readout box ----
  const r = planet.readout;
  const boxX = PAD.left + 10;
  const boxY = PAD.top + 10;
  const lines = [
    `${r.surfaceLabel}: ${r.surfaceT} K`,
    `Tropopause T: ${r.tropopauseT} K @ ${r.tropopauseZ}${planet.useLogP ? '' : ' km'}`,
  ];
  if (r.thermoT !== null) {
    lines.push(`${r.thermoLabel}: ${r.thermoT} K`);
  }
  const lineH = 18;
  const boxPad = 8;
  const boxW = 260;
  const boxH = lines.length * lineH + boxPad * 2;
  ctx.fillStyle = 'rgba(13,17,23,0.75)';
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e6edf3';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], boxX + boxPad, boxY + boxPad + 13 + i * lineH);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function selectStep(range, targetDivisions) {
  const rough = range / targetDivisions;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual  = rough / magnitude;
  if (residual < 1.5) return magnitude;
  if (residual < 3.5) return 2 * magnitude;
  if (residual < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

// ---------------------------------------------------------------------------
// Button wiring
// ---------------------------------------------------------------------------
const buttons = {
  'btn-earth':   PLANETS.Earth,
  'btn-mars':    PLANETS.Mars,
  'btn-venus':   PLANETS.Venus,
  'btn-jupiter': PLANETS.Jupiter,
  'btn-titan':   PLANETS.Titan,
};

for (const [id, planet] of Object.entries(buttons)) {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => {
    currentPlanet = planet;
    // Update active class
    document.querySelectorAll('.preset-buttons button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    draw(currentPlanet);
  });
}

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------
draw(currentPlanet);
