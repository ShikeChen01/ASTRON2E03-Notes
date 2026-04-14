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
