import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ---------------------------------------------------------------------------
// Planet data
// ---------------------------------------------------------------------------

// Terrestrial layer fractions (radii as fraction of full planet radius 0→1)
// Fields: innerCore, outerCore, mantle, full(=1), dynamo
const TERRESTRIAL = {
  earth: {
    name: 'Earth',
    innerCore: 0.19,
    outerCore: 0.55,
    mantle: 0.99,
    crust: 1.00,
    dynamo: 'STRONG',
    frozenCore: false,
  },
  mars: {
    name: 'Mars',
    innerCore: 0.0,
    outerCore: 0.50,
    mantle: 0.98,
    crust: 1.00,
    dynamo: 'NONE',
    frozenCore: true, // outer core is frozen / solidified
  },
  venus: {
    name: 'Venus',
    innerCore: 0.19,
    outerCore: 0.55,
    mantle: 0.99,
    crust: 1.00,
    dynamo: 'WEAK',
    frozenCore: false,
  },
  moon: {
    name: 'Moon',
    innerCore: 0.0,
    outerCore: 0.20,
    mantle: 0.99,
    crust: 1.00,
    dynamo: 'NONE',
    frozenCore: false,
  },
};

// Giant planet layer fractions
// Fields: rockyCore, metallicH, molecularH, cloudTops, dynamo
const GIANT = {
  jupiter: {
    name: 'Jupiter',
    rockyCore: 0.15,
    metallicH: 0.80,
    molecularH: 0.99,
    cloudTops: 1.00,
    dynamo: 'STRONG',
  },
  saturn: {
    name: 'Saturn',
    rockyCore: 0.20,
    metallicH: 0.50,
    molecularH: 0.98,
    cloudTops: 1.00,
    dynamo: 'STRONG',
  },
  neptune: {
    name: 'Neptune',
    rockyCore: 0.20,
    metallicH: 0.75,  // ionic-water layer (plays same dynamo role)
    molecularH: 0.97,
    cloudTops: 1.00,
    dynamo: 'STRONG',
  },
};

const PRESETS = {
  'earth-jupiter': { left: TERRESTRIAL.earth, right: GIANT.jupiter },
  'mars-jupiter':  { left: TERRESTRIAL.mars,  right: GIANT.jupiter },
  'venus-saturn':  { left: TERRESTRIAL.venus, right: GIANT.saturn  },
  'moon-neptune':  { left: TERRESTRIAL.moon,  right: GIANT.neptune },
};

// ---------------------------------------------------------------------------
// Canvas setup
// ---------------------------------------------------------------------------

const canvas = document.getElementById('planets');
const ctx = canvas.getContext('2d');

let currentPreset = PRESETS['earth-jupiter'];

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const C = {
  red:    '#f7768e',
  orange: '#e0af68',
  purple: '#bb9af7',
  blue:   '#7aa2f7',
  grey:   '#8b949e',
  green:  '#9ece6a',
  yellow: '#ffd166',
  text:   '#e6edf3',
  border: '#30363d',
};

// Dynamo → field-line color
function fieldColor(dynamo) {
  if (dynamo === 'STRONG') return C.green;
  if (dynamo === 'WEAK')   return 'rgba(159,206,106,0.45)';
  return C.grey;
}

// Dynamo → label
function fieldLabel(dynamo) {
  if (dynamo === 'STRONG') return 'Magnetic field: STRONG';
  if (dynamo === 'WEAK')   return 'Magnetic field: WEAK';
  return 'Magnetic field: NONE';
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/**
 * Draw a filled circle slice (full disc) centred at (cx, cy) with given radius
 * and fill color.
 */
function disc(cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw a single dipole-like arc field line.
 * The arc starts from angle `startAngle` on the planet surface (radius `R`)
 * and loops out to `extent` * R in the perpendicular direction before
 * coming back to the mirror angle.
 *
 * We approximate a dipole field line shape with a cubic Bézier:
 *   start  = surface point at startAngle
 *   end    = surface point at (π - startAngle)  (southern mirror)
 *   ctrl1/2 = pulled outward
 */
function fieldArc(cx, cy, R, startAngle, extent) {
  const x1 = cx + R * Math.cos(startAngle);
  const y1 = cy + R * Math.sin(startAngle);
  const x2 = cx + R * Math.cos(Math.PI - startAngle);
  const y2 = cy + R * Math.sin(Math.PI - startAngle);

  // Control points: push outward perpendicular to the midpoint axis
  const outR = R * extent;
  const cp1x = cx - outR * Math.cos(startAngle) * 0.7;
  const cp1y = cy - outR * Math.sin(startAngle) * 1.2;
  const cp2x = cx + outR * Math.cos(startAngle) * 0.7;
  const cp2y = cy - outR * Math.sin(startAngle) * 1.2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  ctx.stroke();
}

/**
 * Draw a set of dipole-like field line arcs around the planet.
 * If dynamo is NONE, draw faint dashes to indicate absence.
 */
function drawFieldLines(cx, cy, R, dynamo) {
  const color = fieldColor(dynamo);
  ctx.strokeStyle = color;
  ctx.lineWidth = dynamo === 'NONE' ? 1 : 1.5;

  if (dynamo === 'NONE') {
    // Draw very faint dashed stub to show there's no field
    ctx.setLineDash([3, 5]);
    ctx.globalAlpha = 0.3;
  } else if (dynamo === 'WEAK') {
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.55;
  } else {
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
  }

  // Draw 6 field lines at various tilt angles
  const angles = [Math.PI * 0.18, Math.PI * 0.30, Math.PI * 0.44,
                  Math.PI * 0.56, Math.PI * 0.70, Math.PI * 0.82];
  const extents = [2.2, 1.8, 1.5, 1.5, 1.8, 2.2];

  for (let i = 0; i < angles.length; i++) {
    fieldArc(cx, cy, R, angles[i], extents[i]);
  }

  ctx.globalAlpha = 1.0;
  ctx.setLineDash([]);
}

/**
 * Draw a label string next to a layer, pointing outward from the centre.
 * labelR = radius at which to place the text (absolute px from planet centre).
 * angle  = angle in radians (0 = right).
 */
function layerLabel(cx, cy, labelR, angle, text, color) {
  const tx = cx + labelR * Math.cos(angle);
  const ty = cy + labelR * Math.sin(angle);
  ctx.fillStyle = color || C.text;
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  // Align left/right based on which side of the circle we're on
  ctx.textAlign = Math.cos(angle) >= 0 ? 'left' : 'right';
  ctx.fillText(text, tx, ty);
}

// ---------------------------------------------------------------------------
// Terrestrial planet renderer
// ---------------------------------------------------------------------------

function drawTerrestrial(cx, cy, R, planet) {
  const { innerCore, outerCore, mantle, crust, frozenCore, name } = planet;

  // Draw layers from outside in (painter's algorithm — largest first)
  disc(cx, cy, R * crust,     C.grey);     // crust
  disc(cx, cy, R * mantle,    C.purple);   // mantle
  disc(cx, cy, R * outerCore, frozenCore ? '#c0a060' : C.orange); // outer core
  if (innerCore > 0) {
    disc(cx, cy, R * innerCore, C.red);    // inner core
  }

  // Outline
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Labels — place on right side for left planet, at staggered angles
  const labelOffset = 14; // px gap between disc edge and label start

  // Crust (thin ring — label near top-right)
  const crustMidR = R * (crust - (crust - mantle) / 2);
  layerLabel(cx, cy, R + labelOffset, -0.35, 'Crust', C.grey);

  // Mantle
  const mantleMidR = R * (mantle - (mantle - outerCore) / 2);
  layerLabel(cx, cy, mantleMidR, 0.0, 'Mantle', C.purple);

  // Outer core label
  if (outerCore > 0.15) {
    const ocLabel = frozenCore ? 'Outer core\n(frozen)' : 'Outer core\n(liquid Fe-Ni)';
    const ocR = R * outerCore * 0.70;
    // Draw two lines manually
    ctx.fillStyle = frozenCore ? '#c0a060' : C.orange;
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frozenCore ? 'Outer core' : 'Outer core', cx, cy - ocR * 0.08);
    ctx.fillText(frozenCore ? '(frozen)' : '(liquid Fe-Ni)', cx, cy + ocR * 0.22 + 2);
  }

  // Inner core
  if (innerCore > 0.10) {
    ctx.fillStyle = C.red;
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Inner core', cx, cy - R * innerCore * 0.15);
    ctx.fillText('(solid Fe-Ni)', cx, cy + R * innerCore * 0.25);
  }

  // Planet name above
  ctx.fillStyle = C.text;
  ctx.font = 'bold 15px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, cx, cy - R - 28);

  // Type label
  ctx.fillStyle = C.grey;
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Terrestrial planet', cx, cy - R - 12);

  // Dynamo label below
  const label = fieldLabel(planet.dynamo);
  const labelColor = planet.dynamo === 'STRONG' ? C.green
                   : planet.dynamo === 'WEAK'   ? '#c8e88b'
                   : C.grey;
  ctx.fillStyle = labelColor;
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, cx, cy + R + 12);
}

// ---------------------------------------------------------------------------
// Giant planet renderer
// ---------------------------------------------------------------------------

function drawGiant(cx, cy, R, planet) {
  const { rockyCore, metallicH, molecularH, cloudTops, name } = planet;

  // Layers outside-in
  disc(cx, cy, R * cloudTops,   C.purple);   // cloud tops
  disc(cx, cy, R * molecularH,  C.blue);     // molecular hydrogen
  disc(cx, cy, R * metallicH,   C.orange);   // metallic hydrogen (or ionic water for Neptune)
  disc(cx, cy, R * rockyCore,   C.red);      // rocky/icy core

  // Outline
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Layer labels — centred inside each layer

  // Cloud tops (thin outer ring, label outside)
  const ctLabel = 'Cloud tops';
  const ctAngle = -0.3;
  layerLabel(cx, cy, R + 14, ctAngle, ctLabel, C.purple);

  // Molecular hydrogen
  const molMidR = R * (molecularH - (molecularH - metallicH) / 2) * 0.65;
  ctx.fillStyle = C.blue;
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Molecular H₂', cx, cy - molMidR * 0.1);

  // Metallic hydrogen label
  const metMidR = R * (metallicH - (metallicH - rockyCore) / 2) * 0.72;
  const isNeptune = name === 'Neptune';
  ctx.fillStyle = C.orange;
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isNeptune) {
    ctx.fillText('Ionic water', cx, cy + metMidR * 0.05);
    ctx.fillText('(conducting)', cx, cy + metMidR * 0.35);
  } else {
    ctx.fillText('Metallic H', cx, cy + metMidR * 0.05);
    ctx.fillText('(conducting)', cx, cy + metMidR * 0.35);
  }

  // Rocky core
  if (rockyCore > 0.10) {
    ctx.fillStyle = C.red;
    ctx.font = '11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rocky/icy', cx, cy - R * rockyCore * 0.1);
    ctx.fillText('core', cx, cy + R * rockyCore * 0.3);
  }

  // Planet name above
  ctx.fillStyle = C.text;
  ctx.font = 'bold 15px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, cx, cy - R - 28);

  // Type label
  ctx.fillStyle = C.grey;
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Giant planet', cx, cy - R - 12);

  // Dynamo label below
  const label = fieldLabel(planet.dynamo);
  const labelColor = planet.dynamo === 'STRONG' ? C.green
                   : planet.dynamo === 'WEAK'   ? '#c8e88b'
                   : C.grey;
  ctx.fillStyle = labelColor;
  ctx.font = '12px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, cx, cy + R + 12);
}

// ---------------------------------------------------------------------------
// Main draw
// ---------------------------------------------------------------------------

function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { left, right } = currentPreset;

  // Planet centres: left at 1/4 width, right at 3/4 width
  const leftCX  = W * 0.27;
  const rightCX = W * 0.73;
  const midY    = H * 0.50;

  const leftR  = 170; // px — terrestrial planet display radius
  const rightR = 190; // px — giant planet display radius

  // Draw field lines first (behind planet)
  drawFieldLines(leftCX,  midY, leftR  * 1.05, left.dynamo);
  drawFieldLines(rightCX, midY, rightR * 1.05, right.dynamo);

  // Draw planets on top
  drawTerrestrial(leftCX,  midY, leftR,  left);
  drawGiant(      rightCX, midY, rightR, right);

  // Divider line
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const presetBtns = document.querySelectorAll('.preset-btn');

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPreset = PRESETS[btn.dataset.preset];
    draw();
  });
});

// Initial render
draw();
