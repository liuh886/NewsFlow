import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

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
const publicSupabaseConfigPath = resolve(root, 'public/data/supabase-config.json');
const supabaseConfig = JSON.parse(await readFile(publicSupabaseConfigPath, 'utf8'));
const deploymentUrl = process.env.NEWSFLOW_SUPABASE_URL?.trim();
const deploymentKey = process.env.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY?.trim();
if (Boolean(deploymentUrl) !== Boolean(deploymentKey)) {
  throw new Error('NEWSFLOW_SUPABASE_URL and NEWSFLOW_SUPABASE_PUBLISHABLE_KEY must be configured together.');
}
if (deploymentUrl && deploymentKey) {
  supabaseConfig.enabled = true;
  supabaseConfig.url = deploymentUrl;
  supabaseConfig.publishable_key = deploymentKey;
}
await writeFile(resolve(dist, 'data/supabase-config.json'), `${JSON.stringify(supabaseConfig, null, 2)}\n`, 'utf8');
await build({
  entryPoints: [resolve(root, 'src/supabase-feedback.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  outfile: resolve(dist, 'supabase-feedback.js')
});

console.log(`NewsFlow build complete: dist/ with autonomous Edition layer and Supabase sync ${supabaseConfig.enabled ? 'enabled' : 'disabled'}.`);
