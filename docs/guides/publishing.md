# Publishing LibreGrid

This guide is for LibreGrid maintainers. Consumer installation instructions are
in the project [README](../../README.md).

## Before the first release

1. Be an owner of the `@libregrid` npm organization. Enable npm two-factor
   authentication for **authorization and writes**.
2. Create an npm granular access token named `libregrid-first-release` with
   **Bypass 2FA** enabled. Under **Packages and scopes**, grant **Read and
   write** access to the `@libregrid` scope. Do not grant access to every
   package in the account. Give it a short expiry that covers this release.
   In GitHub, add the copied value as a repository Actions secret named
   `NPM_TOKEN`. Never put this token in the repository or a workflow file.
3. Confirm the GitHub repository is public. Confirm every publishable package
   has a `repository.url` pointing at `https://github.com/libregrid/libregrid`.
   npm provenance requires this.

## Release flow

Releases are manual and batched — see
[release-versioning-plan.md](../design/release-versioning-plan.md). Merging a
PR never publishes; changesets accumulate until you release.

To release:

1. Open **GitHub → Actions → Release → Run workflow** and select `main`.
2. Changesets opens (or updates) a **Version Packages** pull request with the
   lockstep bump, updated changelogs, synced root/docs manifests, and the
   regenerated docs version badge. Review it, then merge.
3. Run the Release workflow again on `main`. It runs the release checks,
   publishes every unpublished package with the `latest` dist-tag, creates the
   `vX.Y.Z` tag, and creates a GitHub Release with notes aggregated from the
   per-package CHANGELOG sections.

The workflow runs `npm run verify` before publishing. It uses
`NPM_CONFIG_PROVENANCE=true`. Changesets supplies `--access public` from the
repository's Changesets configuration. This makes the initial scoped packages
public. It also publishes npm provenance attestations.

## Verify a release

After the workflow reports success, verify a package and its provenance:

```bash
npm view @libregrid/core version
npm view @libregrid/core dist-tags
npm audit signatures
```

Also follow the root README quick start from a clean temporary project before
announcing the release.

## Move to tokenless publishing

You can configure npm trusted publishers only after a package exists on the
registry. After the first release, configure each `@libregrid/*` package in
npm as a GitHub Actions trusted publisher:

- GitHub organization: `libregrid`
- Repository: `libregrid`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

Remove the `NPM_TOKEN` repository secret. On each npm package's **Publishing
access** page, select **Require two-factor authentication and disallow
tokens**. The workflow already has the required GitHub OIDC permission
(`id-token: write`). npm will use its short-lived credential automatically.
