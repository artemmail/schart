/* Controlled CPU profile, not a production frame-rate benchmark.
 * Run before and after an optimization with the same deterministic fixture.
 * Angular DI and ChartSettings HTTP are not involved in these calculations.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const Module = require('node:module');
const { performance } = require('node:perf_hooks');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const label = process.argv[2];
const baselineCommit = '380548994f773ad2301c687b450275d149c28a93';
const baselineFiles = new Set(['models/cluster-data.ts', 'services/footprint-state.service.ts', 'indicators/indicator-engine.ts']);
function readSource(filename) {
  const relative = path.relative(path.join(root, 'src/app/components/footprint'), filename).replaceAll('\\', '/');
  if (label === 'before' && baselineFiles.has(relative)) {
    return execFileSync('git', ['-c', `safe.directory=${path.resolve(root, '../..').replaceAll('\\', '/')}`, 'show',
      `${baselineCommit}:Angular/mat/src/app/components/footprint/${relative}`], { cwd: root, encoding: 'utf8' });
  }
  return fs.readFileSync(filename, 'utf8');
}
if (!['before', 'after'].includes(label)) throw new Error('Use: node scripts/footprint-profile.cjs before|after [output.json]');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('src/')) request = path.join(root, request);
  return resolve.call(this, request, ...args);
};
const load = Module._load;
Module._load = function(request, ...args) {
  if (request === '@angular/core') return { Injectable: () => target => target };
  if (request.endsWith('chart-settings.service')) return { ChartSettingsService: { DefaultSettings: () => ({}) } };
  return load.call(this, request, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readSource(filename), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText, filename);
const feature = path.join(root, 'src/app/components/footprint');
const { ClusterData } = require(path.join(feature, 'models/cluster-data.ts'));
const { Matrix } = require(path.join(feature, 'models/matrix.ts'));
const { FootprintStateService } = require(path.join(feature, 'services/footprint-state.service.ts'));
const { FootprintIndicatorEngine } = require(path.join(feature, 'indicators/indicator-engine.ts'));
const { IndicatorRegistry } = require(path.join(feature, 'indicators/indicator-registry.ts'));
const { registerFootprintBuiltInIndicators } = require(path.join(feature, 'indicators/builtins/register-builtins.ts'));
const barCount = 10000;
const rows = Array.from({ length: barCount }, (_, i) => ({ Number: i + 1,
  x: new Date(Date.UTC(2026, 8, 28, 10) + i * 60000), o: 100 + i % 17, c: 101 + i % 17,
  h: 102 + i % 17, l: 99 + i % 17, q: 100 + i % 9, bq: 40, v: 10000, bv: 4000, oi: 0,
  cl: [{ p: 100 + i % 17, q: 100 + i % 9, bq: 40, ct: 2, mx: 0 }],
}));
const data = new ClusterData({ priceScale: 1, clusterData: rows });
const state = new FootprintStateService(); state.setData(data);
let checksum = 0;
function sample(run, iterations) {
  for (let i = 0; i < 3; i++) run(iterations);
  const times = [];
  for (let i = 0; i < 9; i++) { const start = performance.now(); run(iterations); times.push((performance.now() - start) / iterations); }
  times.sort((a, b) => a - b);
  return { iterations, medianMs: times[4], p90Ms: times[8], samples: 9 };
}
const view = { x: 110, y: 0, w: 1000, h: 600 };
const matrix = new Matrix().scale(8, -4).translate(-9500, 0);
const legacyVisibleRange = () => {
  let min = barCount - 1, max = 0;
  for (let i = 0; i < barCount; i++) {
    const p1 = matrix.applyToPoint(i, 0), p2 = matrix.applyToPoint(i + 1, 0);
    if (!(p2.x < view.x || p1.x > view.x + view.w)) { min = Math.min(min, i); max = Math.max(max, i); }
  }
  return { minIndex: min, maxIndex: max };
};
const visibleRange = label === 'after' ? require(path.join(feature, 'rendering/visible-bars.ts')).getVisibleBars : null;
const metrics = {};
metrics.visibleBars = sample(n => { for (let i = 0; i < n; i++) {
  const range = visibleRange ? visibleRange(matrix, view, barCount) : legacyVisibleRange(); checksum += range.minIndex;
} }, 300);
metrics.stateReads = sample(n => { for (let i = 0; i < n; i++) checksum += (label === 'after' ? state.data : state.snapshot.data).clusterData.length; }, 100000);
const registry = new IndicatorRegistry(); registerFootprintBuiltInIndicators(registry);
let calculations = 0;
for (const def of registry.list()) {
  const create = def.create;
  def.create = (...args) => {
    const instance = create(...args), calculate = instance.onCalculate;
    instance.onCalculate = function(bar) { calculations++; return calculate.call(this, bar); };
    return instance;
  };
}
const engine = new FootprintIndicatorEngine(registry, { requestRender() {}, requestRecalc() {} },
  { ensurePanel: () => 'chart', getPanelHeight: () => 90 });
engine.setData(data); engine.setSettings({ Indicators: [
  { id: 'sma', type: 'sma', params: { period: 20, source: 'close' } },
  { id: 'ema', type: 'ema', params: { period: 20, source: 'close' } },
] }); engine.prepare();
metrics.indicatorFull = sample(n => { for (let i = 0; i < n; i++) { engine.requestFullRecalc(); engine.prepare(); } }, 5);
const previousCalculations = calculations;
metrics.indicatorHover = sample(n => { for (let i = 0; i < n; i++) engine.prepare(); }, 1000);
metrics.indicatorHover.calculations = calculations - previousCalculations;
metrics.merge = sample(n => { for (let i = 0; i < n; i++) {
  const tail = { ...rows.at(-1), c: 105 + i % 3, q: 200 + i };
  data.handleCluster([tail]); checksum += data.revision;
} }, 5);
engine.dispose();
const files = [...baselineFiles];
const hashes = Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(readSource(path.join(feature, file))).digest('hex')]));
const resultFingerprint = crypto.createHash('sha256').update(JSON.stringify({
  bars: data.clusterData, stats: data.getGlobalRenderStats(), totalProfile: data.totalColumn?.cl,
  density: [data.minDens, data.maxDens], thresholds: [data.maxt1, data.maxt2],
}, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value)).digest('hex');
if (label === 'after') {
  const before = JSON.parse(fs.readFileSync(path.join(root, 'docs/footprint-performance-before.json'), 'utf8'));
  if (before.resultFingerprint !== resultFingerprint) throw new Error('Optimized aggregates differ from baseline');
}
const output = { label, baselineCommit, benchmarkHash: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'), fixture: { barCount, clustersPerBar: 1, visibleWidth: 1000, indicators: ['SMA(20)', 'EMA(20)'], warmups: 3 },
  environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model }, metrics, hashes, resultFingerprint, checksum };
const outputPath = process.argv[3] ? path.resolve(root, process.argv[3]) : path.join(root, `docs/footprint-performance-${label}.json`);
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output.metrics, null, 2));

