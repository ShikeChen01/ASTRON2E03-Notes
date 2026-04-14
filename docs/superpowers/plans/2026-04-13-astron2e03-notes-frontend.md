# ASTRON2E03-Notes Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Vite multi-page frontend in `frontend/` where each physics concept is its own standalone interactive page, served via `npm run dev` with HMR, and ship it as a public GitHub repo with a working seed concept (Kepler's laws).

**Architecture:** Vite MPA. Each concept lives in `frontend/concepts/<name>/{index.html,main.js,style.css}` and is auto-discovered by a glob in `vite.config.js`. Shared CSS, KaTeX renderer, and nav injector live in `frontend/shared/`. Gallery `frontend/index.html` hand-maintained as concepts are added.

**Tech Stack:** Node 20+, Vite 5, vanilla HTML/JS/CSS, KaTeX, p5.js (per-concept only when needed), git, gh CLI for GitHub.

**Verification model:** No unit tests (per spec). Each task that touches the dev surface is verified by running `npm run dev`, loading the relevant URL, and confirming the page renders with no console errors.

---

## Task 1: Initialize npm project and git repo

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Verify cwd**

Run: `pwd`
Expected: `/c/Year4/ASTRON` (or equivalent Windows path).

- [ ] **Step 2: Init npm package**

Run: `npm init -y`

Then edit `package.json` so it looks exactly like:

```json
{
  "name": "astron2e03-notes",
  "version": "0.1.0",
  "private": true,
  "description": "Interactive physics concept explanations for ASTRON 2E03.",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
.vite/
.DS_Store
*.log
```

Note: do NOT add `frontend/` or any of the existing course-material files to .gitignore. The repo will contain BOTH the existing ASTRON course files AND the new frontend.

- [ ] **Step 4: Write minimal `README.md`**

```markdown
# ASTRON2E03-Notes

Interactive physics concept explanations for the ASTRON 2E03 course. Each
concept is a standalone HTML/JS/CSS page in `frontend/concepts/`, served
locally via Vite with hot reload.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173/ for the gallery.

## Add a concept

Concepts live in `frontend/concepts/<concept-name>/`. Each contains
`index.html`, `main.js`, `style.css`. Vite picks them up automatically.
```

- [ ] **Step 5: Init git**

Run: `git init && git branch -M main`

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore README.md
git commit -m "chore: init astron2e03-notes npm project"
```

---

## Task 2: Install Vite and KaTeX

**Files:**
- Modify: `package.json` (devDependencies + dependencies added by npm)
- Create: `package-lock.json`

- [ ] **Step 1: Install Vite as dev dependency**

Run: `npm install --save-dev vite`
Expected: `package.json` gains `"devDependencies": { "vite": "^5.x.x" }`, `package-lock.json` is created, `node_modules/` populated.

- [ ] **Step 2: Install KaTeX as runtime dependency**

Run: `npm install katex`
Expected: `"dependencies": { "katex": "^0.16.x" }`.

- [ ] **Step 3: Sanity-check Vite is callable**

Run: `npx vite --version`
Expected: prints a version like `vite/5.x.x`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vite and katex deps"
```

---

## Task 3: Create frontend skeleton and Vite config with auto-discovery

**Files:**
- Create: `frontend/` (directory)
- Create: `frontend/index.html` (placeholder gallery)
- Create: `vite.config.js`

- [ ] **Step 1: Create `frontend/index.html` placeholder**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ASTRON2E03 — Notes</title>
    <link rel="stylesheet" href="/shared/base.css" />
  </head>
  <body>
    <main class="gallery">
      <h1>ASTRON2E03 — Notes</h1>
      <p class="subtitle">Interactive notes for ASTRON 2E03.</p>
      <ul class="concept-list">
        <!-- concept cards go here -->
      </ul>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Write `vite.config.js`**

Vite needs `root` set to `frontend/` so `npm run dev` serves the gallery directly. The MPA inputs are auto-discovered from `frontend/concepts/*/index.html` using `fast-glob` (already a transitive dep of Vite, but we'll use Node's built-in `fs` to avoid adding deps).

```js
import { defineConfig } from 'vite';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, 'frontend');
const conceptsDir = resolve(frontendDir, 'concepts');

function discoverConceptInputs() {
  const inputs = { main: resolve(frontendDir, 'index.html') };
  if (!existsSync(conceptsDir)) return inputs;
  for (const entry of readdirSync(conceptsDir)) {
    const conceptHtml = join(conceptsDir, entry, 'index.html');
    if (existsSync(conceptHtml) && statSync(conceptHtml).isFile()) {
      inputs[entry] = conceptHtml;
    }
  }
  return inputs;
}

export default defineConfig({
  root: frontendDir,
  publicDir: false,
  server: { port: 5173, open: false },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: discoverConceptInputs(),
    },
  },
});
```

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev` (let it run for ~3 seconds, then Ctrl+C)
Expected: Vite logs `Local: http://localhost:5173/` with no errors. The placeholder gallery should be reachable. (If running in a non-interactive shell, run `timeout 5 npm run dev` or background it and kill.)

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html vite.config.js
git commit -m "feat: scaffold frontend dir and vite mpa config"
```

---

## Task 4: Build shared base.css

**Files:**
- Create: `frontend/shared/base.css`

- [ ] **Step 1: Write `frontend/shared/base.css`**

```css
:root {
  --bg: #0e1116;
  --panel: #161b22;
  --fg: #e6edf3;
  --muted: #8b949e;
  --accent: #7aa2f7;
  --accent-2: #bb9af7;
  --border: #30363d;
  --max-width: 880px;
  --radius: 10px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
}

main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

h1 { font-size: 2rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.4rem; margin: 2rem 0 0.5rem; color: var(--accent); }
h3 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; color: var(--accent-2); }

p { color: var(--fg); }
.subtitle { color: var(--muted); margin-top: 0; }

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  background: var(--panel);
  border-radius: 4px;
  padding: 0.1em 0.35em;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: center;
}

.controls label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: var(--muted);
  gap: 0.25rem;
}

.controls input[type="range"] { width: 180px; }

button {
  background: var(--accent);
  color: #0e1116;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
button:hover { filter: brightness(1.1); }

canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  background: #0a0d12;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.gallery .concept-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.gallery .concept-list a {
  display: block;
  padding: 1rem 1.25rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--fg);
}

.gallery .concept-list a:hover {
  border-color: var(--accent);
  text-decoration: none;
}

.gallery .concept-list .concept-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent);
}

.gallery .concept-list .concept-summary {
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.try-this {
  border-left: 3px solid var(--accent-2);
  padding-left: 0.9rem;
  margin: 1rem 0;
}
.try-this h3 { margin-top: 0; color: var(--accent-2); }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/shared/base.css
git commit -m "feat(shared): add base stylesheet"
```

---

## Task 5: Build shared KaTeX renderer

**Files:**
- Create: `frontend/shared/katex.js`

- [ ] **Step 1: Write `frontend/shared/katex.js`**

```js
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Render every element matching `.math` (inline) and `.math-display`
 * (block) under `root` (defaults to document). Reads the LaTeX source
 * from textContent.
 */
export function renderMath(root = document) {
  for (const el of root.querySelectorAll('.math')) {
    katex.render(el.textContent, el, { throwOnError: false, displayMode: false });
  }
  for (const el of root.querySelectorAll('.math-display')) {
    katex.render(el.textContent, el, { throwOnError: false, displayMode: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/shared/katex.js
git commit -m "feat(shared): add katex render helper"
```

---

## Task 6: Build shared nav injector

**Files:**
- Create: `frontend/shared/nav.js`

- [ ] **Step 1: Write `frontend/shared/nav.js`**

```js
/**
 * Inject a "← back to gallery" link at the top of <main> on a concept
 * page. Call once at the top of each concept's main.js.
 */
export function injectBackLink() {
  const main = document.querySelector('main');
  if (!main) return;
  const a = document.createElement('a');
  a.href = '/';
  a.className = 'back-link';
  a.textContent = '← back to gallery';
  main.prepend(a);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/shared/nav.js
git commit -m "feat(shared): add back-link injector"
```

---

## Task 7: Build the Kepler's laws seed concept

**Files:**
- Create: `frontend/concepts/kepler-laws/index.html`
- Create: `frontend/concepts/kepler-laws/main.js`
- Create: `frontend/concepts/kepler-laws/style.css`

- [ ] **Step 1: Write `frontend/concepts/kepler-laws/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kepler's Laws — ASTRON2E03 Notes</title>
    <link rel="stylesheet" href="/shared/base.css" />
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main>
      <h1>Kepler's Laws of Planetary Motion</h1>
      <p class="subtitle">
        How planets actually move: ellipses, equal areas, and the
        period–distance relationship.
      </p>

      <h2>Key equations</h2>
      <div class="panel">
        <p><span class="math-display">T^2 = \frac{4\pi^2}{GM}\,a^3</span></p>
        <p><span class="math-display">\frac{dA}{dt} = \frac{L}{2m} = \text{const}</span></p>
        <p><span class="math-display">r(\theta) = \frac{a(1-e^2)}{1 + e\cos\theta}</span></p>
      </div>

      <h2>Interactive demo</h2>
      <div class="panel">
        <canvas id="orbit" width="800" height="500"></canvas>
        <div class="controls">
          <label>
            Eccentricity (e)
            <input id="ecc" type="range" min="0" max="0.9" step="0.01" value="0.5" />
            <span id="ecc-val">0.50</span>
          </label>
          <label>
            Semi-major axis (a, px)
            <input id="sma" type="range" min="80" max="280" step="1" value="200" />
            <span id="sma-val">200</span>
          </label>
          <label>
            Speed
            <input id="spd" type="range" min="0.2" max="3" step="0.1" value="1" />
            <span id="spd-val">1.0</span>
          </label>
          <button id="toggle">Pause</button>
        </div>
      </div>

      <h2>What you're seeing</h2>
      <p>
        <strong>1st law (ellipses):</strong> the orbit is an ellipse with
        the Sun (yellow dot) at one focus — not the center. As you
        increase eccentricity <span class="math">e</span>, the ellipse
        elongates and the focus moves further from the geometric center.
      </p>
      <p>
        <strong>2nd law (equal areas):</strong> the swept-area wedge
        (purple) accumulates the area covered per unit time. Pause and
        watch — the planet moves <em>fast</em> near the Sun and
        <em>slow</em> far from it, exactly so that
        <span class="math">dA/dt</span> stays constant.
      </p>
      <p>
        <strong>3rd law (T² ∝ a³):</strong> increase
        <span class="math">a</span> and you can see the period grow
        nonlinearly — doubling the semi-major axis makes the orbit take
        roughly <span class="math">2^{1.5} \approx 2.83</span> times
        longer.
      </p>

      <div class="try-this">
        <h3>Try this</h3>
        <ul>
          <li>Set <span class="math">e=0</span>: a perfect circle. The
              speed is constant, the focus and center coincide.</li>
          <li>Set <span class="math">e=0.9</span>: comet-like. Notice how
              long the planet lingers at aphelion.</li>
          <li>Hold <span class="math">e</span> fixed and double
              <span class="math">a</span>. Time the orbit by eye — it
              should feel ~2.8× slower.</li>
        </ul>
      </div>
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `frontend/concepts/kepler-laws/style.css`**

```css
#orbit { aspect-ratio: 8 / 5; }
.controls span { color: var(--fg); font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Write `frontend/concepts/kepler-laws/main.js`**

This implements Kepler's equation solving (Newton's method) so the angular position is physically correct, not just a parametric sweep.

```js
import { renderMath } from '../../shared/katex.js';
import { injectBackLink } from '../../shared/nav.js';

injectBackLink();
renderMath();

const canvas = document.getElementById('orbit');
const ctx = canvas.getContext('2d');
const eccInput = document.getElementById('ecc');
const smaInput = document.getElementById('sma');
const spdInput = document.getElementById('spd');
const eccVal = document.getElementById('ecc-val');
const smaVal = document.getElementById('sma-val');
const spdVal = document.getElementById('spd-val');
const toggleBtn = document.getElementById('toggle');

let e = parseFloat(eccInput.value);
let a = parseFloat(smaInput.value);
let speed = parseFloat(spdInput.value);
let running = true;
let M = 0; // mean anomaly
let lastT = performance.now();

// trail of swept-area wedges (last N ticks)
const trail = [];
const TRAIL_LEN = 90;

function syncLabels() {
  eccVal.textContent = e.toFixed(2);
  smaVal.textContent = a.toFixed(0);
  spdVal.textContent = speed.toFixed(1);
}

eccInput.addEventListener('input', () => { e = parseFloat(eccInput.value); syncLabels(); });
smaInput.addEventListener('input', () => { a = parseFloat(smaInput.value); syncLabels(); });
spdInput.addEventListener('input', () => { speed = parseFloat(spdInput.value); syncLabels(); });
toggleBtn.addEventListener('click', () => {
  running = !running;
  toggleBtn.textContent = running ? 'Pause' : 'Play';
  lastT = performance.now();
});
syncLabels();

// Solve Kepler's equation M = E - e*sin(E) for E (eccentric anomaly)
// using Newton's method.
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 12; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E -= f / fp;
    if (Math.abs(f) < 1e-9) break;
  }
  return E;
}

function planetPosition(M, a, e) {
  const E = solveKepler(M, e);
  // position in the orbital plane, focus at origin
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return { x, y };
}

function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  if (running) {
    // mean motion: scale so a=200, speed=1 → ~6s orbit
    const n = (2 * Math.PI / 6) * speed * Math.pow(200 / a, 1.5);
    M += n * dt;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;
  }

  const { x, y } = planetPosition(M, a, e);
  trail.push({ x, y });
  if (trail.length > TRAIL_LEN) trail.shift();

  draw(x, y);
  requestAnimationFrame(frame);
}

function draw(px, py) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // center the orbit so the FOCUS (Sun) sits at canvas center
  const cx = w / 2;
  const cy = h / 2;

  // draw ellipse — geometric center is offset by (-a*e) from focus
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx - a * e, cy, a, a * Math.sqrt(1 - e * e), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // swept-area wedge trail
  if (trail.length >= 2) {
    ctx.fillStyle = 'rgba(187, 154, 247, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (const p of trail) ctx.lineTo(cx + p.x, cy + p.y);
    ctx.closePath();
    ctx.fill();
  }

  // Sun at the focus
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fill();

  // planet
  ctx.fillStyle = '#7aa2f7';
  ctx.beginPath();
  ctx.arc(cx + px, cy + py, 5, 0, 2 * Math.PI);
  ctx.fill();
}

requestAnimationFrame(frame);
```

- [ ] **Step 4: Verify the page loads**

Run: `npm run dev` and open `http://localhost:5173/concepts/kepler-laws/` in a browser. Confirm:
- No errors in browser console.
- Equations render via KaTeX.
- Orbit animates; sliders change eccentricity / semi-major axis / speed.
- Pause/Play button toggles motion.
- "← back to gallery" link is present at the top.

Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add frontend/concepts/kepler-laws/index.html frontend/concepts/kepler-laws/main.js frontend/concepts/kepler-laws/style.css
git commit -m "feat(concepts): add kepler's laws seed concept"
```

---

## Task 8: Wire the seed concept into the gallery

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Replace the empty `<ul class="concept-list">` with the Kepler card**

Edit `frontend/index.html`. Replace this line:

```html
        <!-- concept cards go here -->
```

with:

```html
        <li>
          <a href="/concepts/kepler-laws/">
            <div class="concept-title">Kepler's Laws of Planetary Motion</div>
            <div class="concept-summary">
              Ellipses, equal areas, and T² ∝ a³ — with a draggable
              eccentricity slider.
            </div>
          </a>
        </li>
```

- [ ] **Step 2: Verify the gallery links to the concept**

Run: `npm run dev` and open `http://localhost:5173/`. Click the Kepler card; it should navigate to the concept page. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(gallery): list kepler's laws concept"
```

---

## Task 9: Document how to add a concept

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a "Project layout" section to `README.md`**

Add at the end of the file:

```markdown
## Project layout

```
frontend/
  index.html              gallery — hand-edited when adding concepts
  concepts/
    <concept-name>/
      index.html          page structure, loads ./main.js + ./style.css
      main.js             demo logic, imports from ../../shared/
      style.css           concept-specific styles
  shared/
    base.css              typography, layout, dark theme
    katex.js              renderMath() helper
    nav.js                injectBackLink() helper
vite.config.js            Vite MPA config; auto-discovers concepts/
```

## Adding a new concept

1. Create `frontend/concepts/<name>/{index.html,main.js,style.css}`.
2. In `index.html`, link `/shared/base.css` and `./style.css`, and load
   `./main.js` as a module.
3. In `main.js`, call `injectBackLink()` and `renderMath()` from
   `../../shared/`.
4. Add a card to `frontend/index.html`'s `<ul class="concept-list">`
   pointing to `/concepts/<name>/`.
5. Restart `npm run dev` (Vite picks up new HTML files at startup).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: explain project layout and how to add concepts"
```

---

## Task 10: Publish to GitHub as a public repo

**Files:**
- (none locally — remote-side action)

- [ ] **Step 1: Confirm `gh` is authenticated**

Run: `gh auth status`
Expected: prints "Logged in to github.com as <username>". If it fails, stop and ask the user to run `gh auth login` themselves (interactive).

- [ ] **Step 2: Create the public repo and push**

Run: `gh repo create ASTRON2E03-Notes --public --source=. --remote=origin --push`

Expected: creates the repo on GitHub under the authenticated user, sets `origin`, and pushes `main`. Prints the repo URL.

- [ ] **Step 3: Verify**

Run: `gh repo view --web` (or just `gh repo view` for terminal output).
Expected: shows the new repo with the README rendered.

---

## Done criteria

- `npm install && npm run dev` works from a fresh clone.
- `http://localhost:5173/` shows the gallery with one card.
- `http://localhost:5173/concepts/kepler-laws/` shows the Kepler demo
  with working sliders, KaTeX equations, animated orbit, and the
  back-link.
- Repo is public on GitHub.
- All commits land on `main`.
