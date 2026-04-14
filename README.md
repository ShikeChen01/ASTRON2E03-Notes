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
