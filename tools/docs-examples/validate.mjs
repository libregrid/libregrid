import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const root = resolve(import.meta.dirname, '../..');
const manifestPath = resolve(root, 'apps/docs/src/app/docs/demo-examples.ts');
const compiled = ts.transpileModule(readFileSync(manifestPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { DEMO_EXAMPLES: examples } = await import(
  `data:text/javascript,${encodeURIComponent(compiled)}`
);
const appConfigPath = resolve(root, 'apps/docs/tsconfig.app.json');
const appConfig = ts.readConfigFile(appConfigPath, ts.sys.readFile);
const appFiles = ts.parseJsonConfigFileContent(
  appConfig.config,
  ts.sys,
  resolve(root, 'apps/docs'),
).fileNames;
assert(
  appFiles.every((file) => !file.includes('/examples/')),
  'Example contents must stay outside the docs application compilation',
);
const angular = JSON.parse(readFileSync(resolve(root, 'angular.json'), 'utf8'));
const nx = JSON.parse(readFileSync(resolve(root, 'apps/docs/project.json'), 'utf8'));
for (const options of [angular.projects.docs.architect.build.options, nx.targets.build.options]) {
  assert(
    options.assets.some(
      (asset) =>
        asset.input === 'apps/docs/examples' &&
        asset.output === 'examples' &&
        asset.glob === '**/*',
    ),
  );
}
const ids = new Set();
const assetRoot = resolve(root, 'apps/docs/examples');
const files = new Set();
for (const example of examples) {
  assert.match(example.id, /^[a-z][a-z0-9-]+$/);
  assert(!ids.has(example.id), `Duplicate demo: ${example.id}`);
  ids.add(example.id);
  assert(example.title.trim() && example.route.trim());
  assert.deepEqual(
    example.variants.map((v) => v.framework),
    example.route === 'angular' ? ['Angular'] : ['TypeScript', 'Angular'],
  );
  for (const variant of example.variants) {
    assert(variant.files.length && variant.files.includes(variant.initialFile));
    assert.equal(new Set(variant.files).size, variant.files.length);
    for (const file of variant.files) {
      assert.match(file, /^[a-zA-Z0-9.-]+$/);
      const path = resolve(assetRoot, variant.directory, file);
      assert(path.startsWith(assetRoot + '/'));
      const source = readFileSync(path, 'utf8');
      assert(source.trim(), `Empty file: ${path}`);
      files.add(path);
      if (!file.endsWith('.ts')) continue;
      const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
      for (const statement of parsed.statements) {
        if (!ts.isImportDeclaration(statement)) continue;
        const name = statement.moduleSpecifier.text;
        assert(
          !name.includes('docs') && !name.includes('/src/') && !name.includes('/dist/'),
          `Private import: ${name}`,
        );
        if (name.startsWith('.')) {
          assert(
            variant.files.includes(name.slice(2) + '.ts'),
            `Unlisted dependency: ${name} in ${path}`,
          );
        } else {
          assert(!name.includes('enterprise'), `Commercial dependency: ${name}`);
        }
      }
    }
  }
}
const actual = readdirSync(assetRoot, { recursive: true })
  .filter((f) => /\.(ts|html|css)$/.test(f))
  .map((f) => resolve(assetRoot, f));
assert.deepEqual(
  [...files].sort(),
  actual.sort(),
  'Every example file must be listed in its viewer',
);

// Independently inspect route templates, including secondary grids. A new grid
// without an inventoried wrapper fails even if nobody remembered to update this test.
const found = new Set();
const routes = resolve(root, 'apps/docs/src/app/routes');
for (const file of readdirSync(routes).filter((f) => f.endsWith('.ts') && f !== 'benchmark.ts')) {
  const source = readFileSync(resolve(routes, file), 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(parsed) === 'template' &&
      ts.isNoSubstitutionTemplateLiteral(node.initializer)
    ) {
      const template = parseTemplate(node.initializer.text, file);
      assert(!template.errors?.length, JSON.stringify(template.errors));
      function walk(nodes, viewer) {
        for (const child of nodes) {
          let parent = viewer;
          if (child.name === 'lgr-docs-demo') {
            parent = child.attributes.find((a) => a.name === 'demoId')?.value;
            assert(ids.has(parent), `Unknown viewer in ${file}: ${parent}`);
            assert(!found.has(parent), `Duplicate viewer: ${parent}`);
            found.add(parent);
          }
          if (child.name === 'ag-grid-angular') assert(parent, `Grid without viewer: ${file}`);
          if (child.children) walk(child.children, parent);
          if (child.branches) walk(child.branches, parent);
        }
      }
      walk(template.nodes);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}
assert.deepEqual([...found].sort(), [...ids].sort(), 'Inventory and public surfaces must agree');
for (const [command, config] of [
  ['tsc', 'typescript'],
  ['ngc', 'angular'],
]) {
  const result = spawnSync(
    resolve(root, `node_modules/.bin/${command}`),
    ['-p', `apps/docs/example-validation/tsconfig.${config}.json`],
    { cwd: root, stdio: 'inherit' },
  );
  assert.equal(result.status, 0, `${config} examples failed compilation`);
}
console.log(
  `Validated ${examples.length} public demos and ${files.size} source files, including Angular templates.`,
);
