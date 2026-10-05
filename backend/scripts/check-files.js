#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const roots = ['server.js', 'src', 'models', 'scripts', 'tests'];
const files = [];
const walk = (path) => {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    if (path.includes('node_modules')) return;
    readdirSync(path).forEach((entry) => walk(join(path, entry)));
  } else if (path.endsWith('.js')) files.push(path);
};
roots.forEach((root) => { try { walk(root); } catch { /* optional directory */ } });

let failed = 0;
for (const file of files) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (error) { failed += 1; console.error(`✖ ${file}\n${error.stderr?.toString() || error.message}`); }
}
console.log(`${files.length - failed}/${files.length} JavaScript files parsed successfully`);
process.exit(failed === 0 ? 0 : 1);
