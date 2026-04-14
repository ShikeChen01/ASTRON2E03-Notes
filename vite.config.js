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
