#!/usr/bin/env node
/**
 * Post-build script: adds .js extensions to relative imports/exports in dist/
 * Required because tsc with moduleResolution:"bundler" doesn't add them,
 * but ESM strict resolution (used by webpack 5) requires them.
 */
import { readdir, readFile, writeFile, stat, access } from 'fs/promises';
import { join, dirname } from 'path';

const DIST = new URL('../dist', import.meta.url).pathname;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(full));
    else if (e.name.endsWith('.js')) files.push(full);
  }
  return files;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

// Match relative imports/exports like: from './foo' or from '../bar/baz'
const RE_FROM = /(?<=(from\s+['"]))(\.\.?\/[^'"]+)(?=['"])/g;
// Match dynamic imports like: import('./foo') or import("../bar/baz")
const RE_DYNAMIC = /(?<=(import\s*\(\s*['"]))(\.\.?\/[^'"]+)(?=['"]\s*\))/g;

async function fix(file) {
  let src = await readFile(file, 'utf8');
  let changed = false;
  const dir = dirname(file);

  // Collect all matches from both static and dynamic imports
  const matches = new Set();
  for (const RE of [RE_FROM, RE_DYNAMIC]) {
    let m;
    const re = new RegExp(RE.source, RE.flags);
    while ((m = re.exec(src)) !== null) {
      const specifier = m[0];
      if (!specifier.endsWith('.js') && !specifier.endsWith('.json')) {
        matches.add(specifier);
      }
    }
  }

  for (const match of matches) {
    const resolved = join(dir, match);
    // Check if it's a directory with index.js
    if (await exists(join(resolved, 'index.js'))) {
      src = src.replaceAll(`'${match}'`, `'${match}/index.js'`);
      src = src.replaceAll(`"${match}"`, `"${match}/index.js"`);
      changed = true;
    } else if (await exists(resolved + '.js')) {
      src = src.replaceAll(`'${match}'`, `'${match}.js'`);
      src = src.replaceAll(`"${match}"`, `"${match}.js"`);
      changed = true;
    }
  }

  if (changed) await writeFile(file, src);
}

const files = await walk(DIST);
// Process sequentially to avoid race conditions with duplicate paths
for (const f of files) {
  await fix(f);
}
console.log(`Fixed ESM imports in ${files.length} files`);
