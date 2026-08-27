# Release & versioning plan

**Status:** Accepted (Option A — manual releases only)
**Date:** 2026-08-21

---

## Diagnosis

### What was already working

- **Lockstep is enforced.** `tools/version/check.mjs` fails CI if any two
  `@libregrid/*` packages have different versions, and `.changeset/config.json`
  groups every package in a `fixed` array. Compatibility drift between packages
  is structurally prevented.
- **AG Grid version is single-sourced.** `packages/*/src/version.ts` holds the
  AG Grid Community version, generated from the installed
  `ag-grid-community/package.json` by `tools/version/generate.mjs`. That is the
  seam-compat policy from ADR 0003, not the LibreGrid version.

### What was broken

| Problem | Evidence |
| --- | --- |
| A release on almost every merged PR | `release.yml` triggered on every successful `main` CI run |
| No GitHub releases or tags | `gh release list` empty, `git tag -l` empty |
| Untracked npm release | npm showed `@1.2.2` while the repo was at `1.2.1` |
| Phantom root version | root `package.json` was `0.1.0` |
| Stale docs badge | `overview.ts` hardcoded `v1.2.1 on npm` |

## Decision

1. **The lockstep version is the project version.** Every `@libregrid/*`
   package, the root `package.json`, and `apps/docs/package.json` all carry the
   same version number. The canonical source is `packages/core/package.json`.
2. **Releases are manual.** The Release workflow runs only via
   `workflow_dispatch`. Changesets accumulate in `.changeset/` across merged
   PRs without bumping anything.
3. **The docs version is generated, never hardcoded.** The docs app reads
   `LIBREGRID_VERSION` from a generated `apps/docs/src/version.ts`.
4. **Every release leaves a trail.** Publish is followed by a `vX.Y.Z` git tag
   and a GitHub Release with aggregated changelog notes.

## Flow

1. Every PR that affects a published package adds a changeset
   (`npx changeset`). Docs-only / test-only / CI-only PRs add an empty
   changeset or omit one. Merging bumps nothing, publishes nothing.
2. When maintainers decide to release, run the **Release** workflow manually on
   `main`.
3. The workflow runs `npx changeset version` (bumps every package in the fixed
   group, updates per-package CHANGELOGs), then syncs the root and docs
   manifests and regenerates the docs version file. It opens (or updates) a
   single **Version Packages** PR.
4. A maintainer reviews and merges that PR.
5. Run the Release workflow again (or merge the Version Packages PR, whose CI
   passes — e2e is skipped for version-only changes). With no changesets left
   and unpublished versions present, the workflow:
   - publishes every package to npm with provenance,
   - creates the `vX.Y.Z` tag,
   - creates a GitHub Release titled `LibreGrid vX.Y.Z` with notes aggregated
     from the per-package CHANGELOG sections.

## Tooling

- `tools/version/generate.mjs` — AG Grid version single-source (unchanged
  purpose), plus generates `apps/docs/src/version.ts` with the LibreGrid
  version.
- `tools/version/workspace.mjs` — reads the lockstep version from
  `packages/core/package.json`; `sync` writes it into the root and docs
  manifests (and maintains a minimal CHANGELOG.md entry in each, which
  changesets/action requires for every package whose version changed);
  `generate` writes `apps/docs/src/version.ts`.
- `tools/version/check.mjs` — extended to fail on docs-version or manifest
  drift.
- `tools/version/release-notes.mjs` — aggregates the `## X.Y.Z` sections from
  every fixed package's CHANGELOG into one release-notes file.
- `tools/release/preflight.mjs` — runs before the verify gate on every release.
  Refuses to start a release that cannot finish: no npm credential, a lockstep
  group split across versions, or a package name that is not yet on the
  registry. Also reports how many packages have a trusted publisher.
- `tools/release/trust-setup.mjs` (`npm run trust:setup`) — configures an npm
  trusted publisher for every publishable package, so the workflow can drop
  `NPM_TOKEN`. Needs npm >= 11 and an interactive 2FA login.
- `.github/workflows/release.yml` — manual trigger only; version command syncs
  manifests and regenerates the docs version; publish step tags and creates
  the GitHub Release. Takes two inputs: `dry_run` validates the entire path
  without publishing, and `allow_new_packages` opts in to creating package
  names that are not yet on the registry.

## Changeset policy

| PR type | Changeset |
| --- | --- |
| New feature / new public API | `minor` |
| Bug fix in published code | `patch` |
| Refactor with no observable change | `patch` or empty |
| Docs-only, test-only, CI-only | empty or omitted |
| Dependency update with no user impact | empty or `patch` |

## Publishing credentials

`changeset publish` publishes one package at a time and cannot roll back. On
2026-08-26 it published 1 of 36 and then hit a package the credential could not
create, leaving the lockstep group split across two versions on the registry.
The preflight exists to make that a pre-release refusal rather than a
mid-release surprise.

Two facts drive the credential design:

- **Creating a package name and publishing a new version of an existing one are
  different npm authorizations.** A token that does the second can still fail
  the first, which is why new names are opt-in per run.
- **A trusted publisher cannot be configured for a package that does not exist
  yet**, so the very first publish of a new package always needs a token.

Publishing is tokenless as of 2026-08-27. All 36 packages trust this workflow
via an npm trusted publisher, and npm >= 11.5.1 exchanges the Actions OIDC token
for a short-lived credential per package. `release.yml` carries no `NPM_TOKEN`
and deliberately no `registry-url` — that input makes setup-node write an
`.npmrc` holding `_authToken=${NODE_AUTH_TOKEN}`, and npm then sends that value
rather than exchanging the OIDC token, so leaving it in with no token set
publishes with a placeholder and returns E404 on every package.

Adding a package is the one case that still needs a human. npm will not
configure a trusted publisher for a package that does not exist, so the first
version has to be published by hand from a 2FA session; then `npm run
trust:setup` brings it into the tokenless path like the rest. The preflight
refuses to start a release containing an unrecognised name unless
`allow_new_packages` says so, which is what turns that into a decision rather
than a half-finished release.

Before a release that adds a package, run the workflow with `dry_run: true`
first. It exercises install, preflight, lint, test, build and every budget gate
without publishing.
