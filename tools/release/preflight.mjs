#!/usr/bin/env node
/**
 * Release preflight — refuses to start a release that cannot finish.
 *
 * `changeset publish` publishes packages one at a time and has no rollback. On
 * 2026-08-26 it published 1 of 36 and then hit a package the credential was not
 * allowed to create, which left the lockstep group split across two versions on
 * the registry. Every check here exists to turn that class of mid-release
 * surprise into a pre-release refusal.
 *
 * Checks (any failure exits non-zero, before a single package is published):
 *   1. An npm credential resolves. A missing or dead credential is invisible
 *      until the first PUT, which returns 404 rather than 401.
 *   2. The lockstep group is on exactly one version.
 *   3. No package name is new to the registry unless the run explicitly opts in
 *      via ALLOW_NEW_PACKAGES=true. Creating a name needs permissions that
 *      publishing a new version of an existing name does not, and a token that
 *      does the second may still fail the first.
 *
 * Also reports, without ever failing the build: which packages have a trusted
 * publisher configured, when an Actions OIDC token is available to ask with.
 *
 * Usage:
 *   node tools/release/preflight.mjs            # full check
 *   node tools/release/preflight.mjs --no-auth  # registry state only
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = 'https://registry.npmjs.org';
const skipAuth = process.argv.includes('--no-auth');
const allowNew = /^(1|true|yes)$/i.test(process.env.ALLOW_NEW_PACKAGES ?? '');
const problems = [];

/** Every non-private workspace package — the set `changeset publish` will touch. */
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
      if (pkg.private || !pkg.name || !pkg.version) continue;
      found.push({ name: pkg.name, version: pkg.version, dir: `${base}/${entry}` });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

async function registryState(pkg) {
  const res = await fetch(`${REGISTRY}/${pkg.name.replace('/', '%2f')}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (res.status === 404) return { ...pkg, state: 'new', latest: null };
  if (!res.ok) return { ...pkg, state: 'unknown', latest: null, error: `HTTP ${res.status}` };
  const body = await res.json();
  const latest = body['dist-tags']?.latest ?? null;
  const exists = Boolean(body.versions?.[pkg.version]);
  return { ...pkg, state: exists ? 'already-published' : 'will-publish', latest };
}

/** Resolve a small pool at a time — 36 packages should not open 36 sockets. */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * Ask the registry whether a trusted publisher is configured, using the same
 * exchange endpoint the npm CLI uses. Report-only: a failure here means the
 * release falls back to a token, which is not itself an error.
 */
async function trustedPublisherReport(packages) {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const reqToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !reqToken) return null;
  let idToken;
  try {
    const res = await fetch(`${url}&audience=npm:registry.npmjs.org`, {
      headers: { authorization: `Bearer ${reqToken}` },
    });
    idToken = (await res.json()).value;
  } catch {
    return null;
  }
  if (!idToken) return null;
  return mapPool(packages, 6, async (pkg) => {
    try {
      const res = await fetch(
        `${REGISTRY}/-/npm/v1/oidc/token/exchange/package/${pkg.name.replace('/', '%2f')}`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
        },
      );
      return { name: pkg.name, trusted: res.ok };
    } catch {
      return { name: pkg.name, trusted: false };
    }
  });
}

const packages = publishablePackages();
if (packages.length === 0) {
  console.error('❌ Preflight found no publishable workspace packages.');
  process.exit(1);
}

// 1. Credential.
let identity = null;
if (skipAuth) {
  console.log('ℹ️  Skipping the credential check (--no-auth).');
} else {
  try {
    identity = execFileSync('npm', ['whoami'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    problems.push(
      'No npm credential resolves. `npm whoami` failed, so every publish would ' +
        'return E404 on PUT rather than a clear auth error.',
    );
  }
}

// 2. Lockstep.
const versions = new Set(packages.map((p) => p.version));
if (versions.size > 1) {
  const spread = [...versions].sort().join(', ');
  problems.push(`Lockstep group is split across versions: ${spread}. Run \`npm run version:packages\`.`);
}

// 3. Registry state.
const states = await mapPool(packages, 8, registryState);
const news = states.filter((s) => s.state === 'new');
const willPublish = states.filter((s) => s.state === 'will-publish');
const done = states.filter((s) => s.state === 'already-published');
const unknown = states.filter((s) => s.state === 'unknown');

const width = Math.max(...states.map((s) => s.name.length));
console.log('');
for (const s of states) {
  const mark = { new: '🆕', 'will-publish': '➕', 'already-published': '✅', unknown: '❔' }[s.state];
  const note = { new: 'new name — not on registry', 'will-publish': `registry has ${s.latest}`, 'already-published': 'already at this version', unknown: s.error }[s.state];
  console.log(`   ${mark} ${s.name.padEnd(width)}  ${s.version}   ${note}`);
}
console.log('');
console.log(
  `   ${willPublish.length} to publish · ${done.length} already published · ${news.length} new names` +
    (identity ? ` · authenticated as ${identity}` : ''),
);

if (unknown.length) {
  problems.push(
    `Could not read registry state for: ${unknown.map((s) => s.name).join(', ')}. Refusing to publish blind.`,
  );
}

if (news.length && !allowNew) {
  problems.push(
    `${news.length} package name(s) are new to the registry: ${news.map((s) => s.name).join(', ')}.\n` +
      '     Creating a name needs permission that publishing an existing one does not, and npm\n' +
      '     cannot pre-configure a trusted publisher for a package that does not exist yet.\n' +
      '     Re-run with ALLOW_NEW_PACKAGES=true once the credential is known to allow creation.',
  );
}

// Report-only trusted-publisher readiness.
const trust = await trustedPublisherReport(packages);
if (trust) {
  const configured = trust.filter((t) => t.trusted);
  console.log(
    `   trusted publishers: ${configured.length}/${trust.length} configured` +
      (configured.length === trust.length ? ' — tokenless publishing is ready' : ''),
  );
  const missing = trust.filter((t) => !t.trusted).map((t) => t.name);
  if (missing.length && missing.length <= 8) {
    console.log(`   without a trusted publisher: ${missing.join(', ')}`);
  }
}

if (problems.length) {
  console.error('\n❌ Release preflight failed — nothing has been published:\n');
  for (const p of problems) console.error('   ' + p);
  console.error('');
  process.exit(1);
}
console.log('\n✅ Release preflight passed.\n');
