#!/usr/bin/env node
/**
 * Configures an npm trusted publisher for every publishable workspace package,
 * so the Release workflow can publish without a long-lived NPM_TOKEN.
 *
 * Why this exists as a script: npm accepts a trusted-publisher config only for
 * a package that already exists, only one package at a time, and the npmjs.com
 * UI is 36 separate visits. `npm trust` does the same thing over the API.
 *
 * Requirements:
 *   - npm >= 11.5.1 (`npm trust` does not exist in npm 10).
 *   - An interactive, 2FA-backed npm session. Trust configuration counts as an
 *     account change, so a publish-only granular token gets 403 and a token
 *     that bypasses 2FA is exactly what npm is in the process of restricting.
 *     Run `npm login` first and expect a browser prompt.
 *
 * Usage:
 *   node tools/release/trust-setup.mjs --dry-run   # show what would change
 *   node tools/release/trust-setup.mjs             # apply
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_FILE = 'release.yml';
const dryRun = process.argv.includes('--dry-run');

function repository() {
  const explicit = process.argv.find((a) => a.startsWith('--repo='));
  if (explicit) return explicit.slice('--repo='.length);
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = /github\.com[:/](.+?)(?:\.git)?$/.exec(url);
  if (!match) throw new Error(`Cannot derive owner/repo from origin: ${url}`);
  return match[1];
}

function publishablePackages() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const found = [];
  for (const pattern of manifest.workspaces ?? []) {
    const base = pattern.replace('/*', '');
    const dir = join(root, base);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry, 'package.json');
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, 'utf8'));
      if (pkg.private || !pkg.name) continue;
      found.push(pkg.name);
    }
  }
  return found.sort();
}

/**
 * Find an npm that has `npm trust`, which means npm >= 11.
 *
 * The npm first on PATH is not necessarily the one `npm install -g npm@11`
 * upgraded: a version manager or a tool-managed node (nvm, Hermes, asdf) can
 * leave an older npm shadowing a newer one, and `npm run` hands scripts the
 * npm that invoked them. So check PATH first, then the global prefix, and only
 * give up once both are too old.
 */
function npmVersion(bin) {
  try {
    return execFileSync(bin, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function resolveNpm() {
  const candidates = [{ bin: 'npm', label: 'npm on PATH' }];
  try {
    const prefix = execFileSync('npm', ['prefix', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (prefix) candidates.push({ bin: join(prefix, 'bin', 'npm'), label: `${prefix}/bin/npm` });
  } catch {
    /* no global prefix is not fatal — PATH may still be new enough */
  }

  const seen = [];
  for (const candidate of candidates) {
    const version = npmVersion(candidate.bin);
    if (!version) continue;
    seen.push(`${candidate.label} is ${version}`);
    if (Number(version.split('.')[0]) >= 11) return { ...candidate, version };
  }
  console.error(
    '❌ No npm with a `trust` command was found — it needs npm >= 11.\n\n' +
      seen.map((line) => `   ${line}`).join('\n') +
      '\n\n   Run `npm install -g npm@11`. If that reports success and this still fails,\n' +
      '   an older npm is shadowing it on PATH — `which -a npm` will show which.\n',
  );
  process.exit(1);
}

const npmBin = resolveNpm();
if (npmBin.bin !== 'npm') {
  console.log(`\nUsing ${npmBin.label} (${npmBin.version}) — the npm on PATH is older.`);
}

const repo = repository();
const packages = publishablePackages();
console.log(
  `\n${dryRun ? 'Would configure' : 'Configuring'} trusted publishers for ${packages.length} packages` +
    `\n   repository: ${repo}\n   workflow:   ${WORKFLOW_FILE}\n`,
);

/**
 * npm allows one trusted publisher per package, so re-running should not try to
 * reconfigure what is already correct. Matched on the raw listing rather than a
 * parsed shape: the exact JSON is not worth depending on, and a crude match
 * that degrades to "configure it again" is safer than a parse that throws.
 */
function alreadyConfigured(name) {
  try {
    const out = execFileSync(npmBin.bin, ['trust', 'list', name, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.includes(repo) && out.includes(WORKFLOW_FILE);
  } catch {
    return false;
  }
}

const failed = [];
const skipped = [];
let done = 0;
for (const name of packages) {
  if (alreadyConfigured(name)) {
    skipped.push(name);
    console.log(`   ⏭️  ${name} — already trusts ${repo}/${WORKFLOW_FILE}`);
    continue;
  }
  const args = [
    'trust',
    'github',
    name,
    '--file',
    WORKFLOW_FILE,
    '--repo',
    repo,
    '--allow-publish',
    '--yes',
  ];
  if (dryRun) args.push('--dry-run');
  try {
    // Inherit stdio so npm's browser-based OTP prompt stays usable. The first
    // package authenticates; the rest reuse that session.
    execFileSync(npmBin.bin, args, { stdio: 'inherit' });
    done += 1;
    console.log(`   ✅ ${name}`);
  } catch {
    failed.push(name);
    console.log(`   ❌ ${name}`);
  }
}

console.log(
  `\n${done} configured, ${skipped.length} already set, ${failed.length} failed ` +
    `(${packages.length} total).`,
);
if (failed.length) {
  console.error(`\n❌ Failed: ${failed.join(', ')}`);
  console.error(
    '\n   A 403 here usually means the session is a publish-only token rather than\n' +
      '   an interactive 2FA login. Run `npm login`, then re-run this script —\n' +
      '   packages that are already configured are detected and skipped.\n',
  );
  process.exit(1);
}
console.log(
  '\n✅ Every package trusts this workflow. Remove `registry-url` and NODE_AUTH_TOKEN\n' +
    '   from .github/workflows/release.yml, then run the workflow with dry_run to confirm\n' +
    '   the preflight reports 36/36 trusted publishers.\n',
);
