import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'README.md',
  'docs/ci-governance.md',
  '.github/workflows/ci.yml',
  '.github/workflows/pages.yml',
  'package.json',
  'index.html',
  'src/reader/core.js',
  'src/reader.css',
  'scripts/check.mjs',
  'scripts/build.mjs',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required product file: ${file}`);
}

const lockfiles = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
].filter((file) => existsSync(file));

if (lockfiles.length !== 1) {
  failures.push(`package.json requires exactly one recognized lockfile; found ${lockfiles.length}.`);
}

let packageJson;
try {
  packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (packageJson) {
  for (const script of ['check', 'build']) {
    const value = packageJson.scripts?.[script];
    if (typeof value !== 'string' || value.trim().length === 0) {
      failures.push(`package.json must define a non-empty ${script} script.`);
    }
  }
}

const readme = existsSync('README.md') ? readFileSync('README.md', 'utf8') : '';
for (const phrase of ['Product status', 'Editorial Signal Desk', 'CI and deployment']) {
  if (!readme.includes(phrase)) failures.push(`README.md must describe ${phrase}.`);
}

if (failures.length > 0) {
  console.error('NewsFlow repository contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`NewsFlow repository contract passed. stage=implemented-product; lockfiles=${lockfiles.length}`);
