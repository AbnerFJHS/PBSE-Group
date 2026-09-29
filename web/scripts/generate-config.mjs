// Runs as the static site's buildCommand on Render. Writes config.json,
// which the app fetches at runtime, so the API URL is never hardcoded or
// baked into JS at commit time (A.2 §4).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  console.error('API_BASE_URL is required to build web/config.json');
  process.exit(1);
}

const out = fileURLToPath(new URL('../config.json', import.meta.url));
writeFileSync(out, JSON.stringify({ apiBaseUrl }, null, 2) + '\n');
console.log(`wrote ${out} with apiBaseUrl = ${apiBaseUrl}`);
