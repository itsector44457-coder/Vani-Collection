#!/usr/bin/env node
/** Prints every route the API registers. Usage: node scripts/list-routes.js [--json] */
process.env.JWT_ACCESS_SECRET ||= 'route-listing-secret-value-that-is-long-enough';
process.env.JWT_REFRESH_SECRET ||= 'route-listing-secret-value-that-is-long-enough';
process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/vani_route_listing';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');

const noop = () => {};
const app = buildApp({ config: loadConfig(), logger: { info: noop, warn: noop, error: noop, debug: noop, child() { return this; } } });

const routes = [];
for (const { base, router } of app.locals.routes) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const path = layer.route.path === '/' ? '' : layer.route.path;
    const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase()).sort();
    routes.push({ methods, path: `${base}${path}` });
  }
}
routes.sort((a, b) => a.path.localeCompare(b.path));
if (process.argv.includes('--json')) console.log(JSON.stringify(routes, null, 2));
else console.log(`${routes.length} routes registered\n${routes.map((r) => `${r.methods.join(',').padEnd(20)} ${r.path}`).join('\n')}`);
