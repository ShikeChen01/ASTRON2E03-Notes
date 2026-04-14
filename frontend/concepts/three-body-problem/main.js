import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

// ── DOM references ────────────────────────────────────────────────────────────
const canvas     = document.getElementById('three-body');
const ctx        = canvas.getContext('2d');
const perturbInput = document.getElementById('perturb');
const spdInput   = document.getElementById('spd');
const perturbVal = document.getElementById('perturb-val');
const spdVal     = document.getElementById('spd-val');
const resetBtn   = document.getElementById('reset');
const toggleBtn  = document.getElementById('toggle');

// ── Simulation constants ──────────────────────────────────────────────────────
const G          = 10000;    // gravitational constant (scaled so orbits are visible)
const MASS       = 1;        // equal masses
const DT_BASE    = 0.005;    // base time step (simulation units)
const SUBSTEPS   = 8;        // velocity-Verlet substeps per animation frame
const SOFTENING  = 5;        // px — avoids singularity on close encounters
const TRAIL_LEN  = 200;      // number of past positions to keep per body

// Triangle scale: half-side in canvas pixels.  Keep well inside 800×500.
const TRI_RADIUS = 130;      // circumradius of starting equilateral triangle

// ── Body colors ───────────────────────────────────────────────────────────────
const COLORS = ['#ffd166', '#7aa2f7', '#bb9af7'];

// ── State ─────────────────────────────────────────────────────────────────────
let bodies  = [];   // [{ x, y, vx, vy, ax, ay }]
let trails  = [];   // [Array<{x,y}>]
let running = true;
let lastT   = performance.now();
let speed   = parseFloat(spdInput.value);
let perturbation = parseFloat(perturbInput.value);

// ── Initial conditions (equilateral triangle with tangential velocities) ──────
function initBodies(perturb) {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  // Lagrange equilateral-triangle solution: each body orbits the COM at
  // radius R with speed v = sqrt(G * M / (sqrt(3) * R)).
  // Derivation: net force toward COM = sqrt(3)*G*M^2/s^2 (s = sqrt(3)*R),
  // set equal to M*v^2/R  =>  v^2 = G*M/(sqrt(3)*R).
  // This is the *only* value of v that keeps the triangle rigid; any other
  // value (or a perturbation to one body) eventually leads to chaos.
  const R      = TRI_RADIUS;
  const vOrbit = Math.sqrt(G * MASS / (Math.sqrt(3) * R));

  bodies = [];
  trails = [[], [], []];

  for (let i = 0; i < 3; i++) {
    // vertex angle for equilateral triangle, start rotated 90° so one body
    // sits at the top
    const angle = (Math.PI / 2) + (i * 2 * Math.PI / 3);

    // position: vertex of the triangle (+ perturbation on body 0 only)
    const px = cx + R * Math.cos(angle) + (i === 0 ? perturb * R : 0);
    const py = cy - R * Math.sin(angle) + (i === 0 ? perturb * R : 0);

    // tangential velocity (perpendicular to radius, counter-clockwise)
    const vx = -vOrbit * Math.sin(angle);
    const vy = -vOrbit * Math.cos(angle);

    bodies.push({ x: px, y: py, vx, vy, ax: 0, ay: 0 });
  }

  // Compute initial accelerations so the first Verlet step is correct
  computeAccelerations();
}

// ── Physics ───────────────────────────────────────────────────────────────────
function computeAccelerations() {
  // Zero out
  for (const b of bodies) { b.ax = 0; b.ay = 0; }

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx  = bodies[j].x - bodies[i].x;
      const dy  = bodies[j].y - bodies[i].y;
      const r2  = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const r3  = Math.pow(r2, 1.5);
      const f   = G * MASS / r3;   // magnitude / r (both masses are MASS)

      bodies[i].ax += f * dx;
      bodies[i].ay += f * dy;
      bodies[j].ax -= f * dx;
      bodies[j].ay -= f * dy;
    }
  }
}

// Velocity-Verlet integrator: one substep of size dt
function verletStep(dt) {
  // 1. half-kick velocities
  for (const b of bodies) {
    b.vx += 0.5 * b.ax * dt;
    b.vy += 0.5 * b.ay * dt;
  }
  // 2. drift positions
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  // 3. recompute accelerations at new positions
  computeAccelerations();
  // 4. second half-kick
  for (const b of bodies) {
    b.vx += 0.5 * b.ax * dt;
    b.vy += 0.5 * b.ay * dt;
  }
}

// ── Trail management ──────────────────────────────────────────────────────────
function pushTrail() {
  for (let i = 0; i < 3; i++) {
    trails[i].push({ x: bodies[i].x, y: bodies[i].y });
    if (trails[i].length > TRAIL_LEN) trails[i].shift();
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Draw trails with fading alpha
  for (let i = 0; i < 3; i++) {
    const t = trails[i];
    if (t.length < 2) continue;
    for (let k = 1; k < t.length; k++) {
      const alpha = k / t.length;          // 0 (oldest) → 1 (newest)
      ctx.strokeStyle = hexAlpha(COLORS[i], alpha * 0.75);
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(t[k - 1].x, t[k - 1].y);
      ctx.lineTo(t[k].x,     t[k].y);
      ctx.stroke();
    }
  }

  // Draw bodies
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = COLORS[i];
    ctx.beginPath();
    ctx.arc(bodies[i].x, bodies[i].y, 7, 0, 2 * Math.PI);
    ctx.fill();
    // subtle glow
    ctx.strokeStyle = hexAlpha(COLORS[i], 0.35);
    ctx.lineWidth   = 4;
    ctx.stroke();
  }

  // HUD
  ctx.fillStyle    = '#8b949e';
  ctx.font         = '13px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`perturbation = ${perturbation.toFixed(3)}`, 14, 14);
  ctx.fillText(`speed = ${speed.toFixed(1)}x`, 14, 32);
}

// Helper: turn "#rrggbb" + alpha into "rgba(...)"
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ── Animation loop ────────────────────────────────────────────────────────────
function frame(now) {
  const wallDt = Math.min((now - lastT) / 1000, 0.05);  // cap at 50 ms
  lastT = now;

  if (running) {
    const simDt = DT_BASE * speed;
    const steps = SUBSTEPS;
    for (let s = 0; s < steps; s++) {
      verletStep(simDt);
    }
    pushTrail();
  }

  draw();
  requestAnimationFrame(frame);
}

// ── Controls ──────────────────────────────────────────────────────────────────
function syncLabels() {
  perturbVal.textContent = perturbation.toFixed(3);
  spdVal.textContent     = speed.toFixed(1);
}

perturbInput.addEventListener('input', () => {
  perturbation = parseFloat(perturbInput.value);
  syncLabels();
});

spdInput.addEventListener('input', () => {
  speed = parseFloat(spdInput.value);
  syncLabels();
});

resetBtn.addEventListener('click', () => {
  initBodies(perturbation);
});

toggleBtn.addEventListener('click', () => {
  running = !running;
  toggleBtn.textContent = running ? 'Pause' : 'Play';
  lastT = performance.now();
});

// ── Kick-off ──────────────────────────────────────────────────────────────────
syncLabels();
initBodies(0);
requestAnimationFrame(frame);
