import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const index = await readFile(resolve(root, 'index.html'), 'utf8');
await writeFile(resolve(dist, 'index.html'), index, 'utf8');
await cp(resolve(root, 'src/editorial-app.js'), resolve(dist, 'editorial-app.js'));
await cp(resolve(root, 'src/polish.js'), resolve(dist, 'polish.js'));
await cp(resolve(root, 'src/edition-layer.js'), resolve(dist, 'edition-layer.js'));
await cp(resolve(root, 'src/language-polish.js'), resolve(dist, 'language-polish.js'));
await cp(resolve(root, 'src/styles.css'), resolve(dist, 'styles.css'));
await cp(resolve(root, 'src/polish.css'), resolve(dist, 'polish.css'));
await cp(resolve(root, 'src/edition-layer.css'), resolve(dist, 'edition-layer.css'));
await cp(resolve(root, 'public'), dist, { recursive: true });

console.log('NewsFlow build complete: dist/ with autonomous Edition and language consistency layers.');
