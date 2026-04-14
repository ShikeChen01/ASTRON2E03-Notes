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
