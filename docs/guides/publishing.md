# Publishing LibreGrid

This guide is for LibreGrid maintainers. Consumer installation instructions are
in the project [README](../../README.md).

## How releases work

Releases are **manual and batched** — see
[release-versioning-plan.md](../design/release-versioning-plan.md). Merging a
PR never publishes; changesets accumulate until you release. All publishable
packages version in lockstep: a changeset on any package bumps the whole group
to one version.

Publishing is **tokenless**: every `@libregrid/*` package trusts the Release
workflow as an npm trusted publisher (GitHub Actions: repo
`libregrid/libregrid`, workflow `release.yml`, allowed action `npm publish`).
The workflow has `id-token: write`, and the npm CLI (≥11.15.0) exchanges the
Actions OIDC token for a short-lived credential automatically. No `NPM_TOKEN`
secret is used, and none should be configured — see
[npm/cli#8544](https://github.com/npm/cli/issues/8544) for the one thing
trusted publishing cannot do (creating new package names), covered in
[Adding a new package](#adding-a-new-package) below.

## Standard release flow (existing packages)

1. Open **GitHub → Actions → Release → Run workflow** and select `main`
   (defaults are correct; leave `allow_new_packages` off).
2. Changesets opens (or updates) a **Version Packages** pull request with the
   lockstep bump, updated changelogs, synced root/docs manifests, and the
   regenerated docs version badge. Review it, then merge.
3. Run the Release workflow again on `main`. It runs the release preflight and
   the `npm run verify` gate, publishes every unpublished package with the
   `latest` dist-tag, creates the `vX.Y.Z` tag, and creates a GitHub Release
   with notes aggregated from the per-package CHANGELOG sections.

The workflow publishes with `NPM_CONFIG_PROVENANCE=true`, so every package
gets an npm provenance attestation.

## Adding a new package

> **GitHub Actions cannot create a new package name.** npm's trusted
> publishing only authorizes publishes for packages that already exist — the
> trusted publisher is configured on the package's registry settings page, and
> npm cannot configure one for a name that is not on the registry yet
> ([npm/cli#8544](https://github.com/npm/cli/issues/8544)). The first publish
> of every new package name is always a **manual step**.

The release preflight enforces this: a release run that would publish new
package names without a resolvable npm token refuses **before publishing
anything** — even with `ALLOW_NEW_PACKAGES=true`. That flag opts in a run that
holds a creating-capable credential; it is not a bypass. This guard exists
because `changeset publish` is sequential with no rollback: run 34171509385
hit a name it could not create, aborted mid-flight, and left the lockstep
group split (some packages published, some stranded on the previous version,
one absent). The preflight turns that class of surprise into a pre-release
refusal.

So when a PR adding a new package merges:

1. **Changeset first.** Make sure the new package carries a changeset (patch
   is fine) so the lockstep group bumps it along with everything else.
2. **Version.** Run the Release workflow and merge the Version Packages PR as
   usual — every manifest, including the new package, moves to the new
   lockstep version. Do **not** run the publish dispatch yet.
3. **First-publish manually**, from a machine logged in to an npm account that
   can create names in the `@libregrid` org:

   ```bash
   npx nx build <package-name>            # produce packages/<name>/dist
   cd packages/<package-name>
   npm publish --access public            # this one publish has no provenance
   ```

4. **Configure the trusted publisher immediately**, so every later version is
   tokenless again:

   ```bash
   npm trust github @libregrid/<package-name> --file release.yml \
     --repo libregrid/libregrid --allow-publish --yes
   ```

   (Equivalent UI path: npmjs.com → the package → **Settings → Trusted
   publisher**: repository `libregrid/libregrid`, workflow filename
   `release.yml`.)
5. **Re-run the Release workflow** on `main`. It publishes any packages left
   behind, creates the `vX.Y.Z` tag, and completes the release.

Steps 3–4 are per package and once. After the name exists, releases involving
it need nothing special.

## Verify a release

After the workflow reports success, verify a package and its provenance:

```bash
npm view @libregrid/core version
npm view @libregrid/core dist-tags
npm audit signatures
```

Also follow the root README quick start from a clean temporary project before
announcing the release.

## Trusted-publisher maintenance

The configs were created in bulk with the npm CLI (≥11.15.0):

```bash
for d in packages/*/; do
  name=$(node -p "require('./$d/package.json').name")
  npm trust github "$name" --file release.yml --repo libregrid/libregrid --allow-publish --yes
  sleep 2
done
```

Verify with `npm trust list @libregrid/core`. Recreate a config with
`npm trust revoke --id <id> <package>` followed by the `npm trust github`
command above.

Remaining hardening, per package on npmjs.com under **Settings → Publishing
access**: select **Require two-factor authentication and disallow tokens**.
Trusted publishers use OIDC, so this does not break the Release workflow.
