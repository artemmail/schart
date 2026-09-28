const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let count = 0;
const errors = [];
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : entry.name.endsWith('.ts') ? [file] : [];
  });
}
function checkCase(file) {
  const relative = path.relative(root, file); let current = root;
  for (const segment of relative.split(path.sep)) {
    if (!fs.existsSync(current) || !fs.readdirSync(current).includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}
for (const file of files(path.join(root, 'src/app/components/footprint'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  for (const node of source.statements) {
    if ((!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) || !node.moduleSpecifier) continue;
    const specifier = node.moduleSpecifier.text;
    if (!specifier.startsWith('.') && !specifier.startsWith('src/')) continue;
    const base = specifier.startsWith('src/') ? path.join(root, specifier) : path.resolve(path.dirname(file), specifier);
    const resolved = [`${base}.ts`, `${base}.d.ts`, path.join(base, 'index.ts')].find(fs.existsSync);
    count++;
    if (!resolved || !checkCase(resolved)) errors.push(`${path.relative(root, file)}: ${specifier}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Footprint: ${count} local imports resolve with exact filesystem case.`);
