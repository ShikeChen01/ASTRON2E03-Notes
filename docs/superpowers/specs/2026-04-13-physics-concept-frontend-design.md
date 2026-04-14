# ASTRON2E03-Notes — Physics Concept Frontend — Design

**Date:** 2026-04-13
**Status:** Approved
**Project name:** `astron2e03-notes` (package.json name, repo name)
**Visibility:** Public GitHub repo

## Purpose

A local-hosted frontend in `frontend/` that lets Claude explain physics
concepts (primarily astronomy/dynamics for the ASTRON course) through
interactive HTML/JS/CSS demos. The user runs `npm run dev` once and gets
live-reloaded updates as new concepts are added.

## Scope

- Multi-page gallery. Each concept is its own standalone page.
- Claude scaffolds a new concept page per request; previous concepts are
  preserved for later review.
- Vite + vanilla HTML/JS/CSS + KaTeX for equations. p5.js is allowed
  per-concept when a demo genuinely benefits (e.g., n-body), not by default.

Out of scope: user accounts, persistence, backend, deployment, framework
(React/Vue/etc.).

## Architecture

```
frontend/
  index.html                  gallery — lists all concepts
  concepts/
    kepler-laws/
      index.html
      main.js
      style.css
    <next-concept>/...
  shared/
    base.css                  typography, layout, dark theme
    katex.js                  KaTeX loader helper
    nav.js                    injects "← back to gallery" link
  vite.config.js              MPA inputs auto-discovered from concepts/
  package.json
  README.md
```

### Multi-page setup

`vite.config.js` uses a glob over `concepts/*/index.html` to build the
`rollupOptions.input` map at config-load time. Adding a new concept
requires no config edits — drop a folder, Vite picks it up on next
start. HMR works during dev without restart because Vite serves any
existing HTML file directly.

### Shared layer

- `shared/base.css` — reset, typography, layout variables, dark bg. Every
  concept imports this first.
- `shared/katex.js` — exports a `renderMath(el)` helper that auto-renders
  all `.math` / `.math-display` elements on the page using KaTeX's
  auto-render extension. Loaded from npm (`katex` package).
- `shared/nav.js` — injects a back-link to the gallery at the top of each
  concept page so every page is navigable without hand-written nav.

### Gallery (`frontend/index.html`)

Static list of concept cards. Each card: title, one-line summary, link
to `concepts/<name>/`. Hand-maintained by Claude when adding concepts —
simpler than runtime discovery and avoids needing a dev-only API.

## Per-Concept Page Structure

Every concept page follows this skeleton so the user always knows where
to look:

1. **Title + one-line summary**
2. **Key equations** (KaTeX-rendered)
3. **Interactive demo** — canvas or DOM, with sliders / play-pause /
   draggable elements. Every concept must have at least one interactive
   element.
4. **Short written explanation** — plain English, directly tied to what
   the demo visualizes.
5. **"Try this" prompts** — 2–4 small experiments the user can do with
   the controls to build intuition.

### File conventions per concept

- `index.html` — structure only, loads `./main.js` as a module and
  `./style.css`.
- `main.js` — imports from `../../shared/`, owns all demo logic. Canvas
  code lives here; for p5 demos, imports p5 locally.
- `style.css` — concept-specific styling only. Anything reusable goes to
  `shared/base.css`.

## Workflow

1. User runs `npm install` once, then `npm run dev`.
2. Vite serves on `localhost:5173` with HMR.
3. When the user asks Claude to explain a concept, Claude:
   - creates `concepts/<name>/{index.html,main.js,style.css}`
   - adds a card to `frontend/index.html`
   - tells the user to refresh (new HTML files require a reload, not just
     HMR)
4. Saves to existing concept files hot-reload without refresh.

## Seed Concept

**Kepler's laws** — ties to current ASTRON assignments.

- Draggable eccentricity slider
- Elliptical orbit rendered on canvas
- Animated orbital motion showing equal-area sweep in equal time
- Key equations: `T² ∝ a³`, area-sweep rule
- "Try this": set e=0 (circle), e=0.9 (comet-like), adjust semi-major
  axis and watch period change

## Testing / Verification

No automated tests. Verification is visual: `npm run dev`, open the
page, confirm demo renders and controls work. Claude runs a dev-server
sanity check after the initial scaffold (loads page, watches for
console errors).

## Non-Goals / YAGNI

- No routing library — multi-page with native `<a href>` navigation is
  enough.
- No build output inspection — we only care about dev mode.
- No shared state between concepts.
- No TypeScript — vanilla JS keeps the read-the-source goal honest.
- No test framework — this is an explain-to-me tool, not a product.
