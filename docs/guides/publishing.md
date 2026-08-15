# Publishing LibreGrid

This guide is for LibreGrid maintainers. Consumer installation instructions are
in the project [README](../../README.md).

## Before the first release

1. Be an owner of the `@libregrid` npm organisation and enable npm two-factor
   authentication for **authorization and writes**.
2. In GitHub, add a repository Actions secret named `NPM_TOKEN`. It must be an
   npm granular access token with permission to publish the `@libregrid/*`
   packages. The initial direct publication needs a token that can bypass 2FA.
   Never put this token in the repository or a workflow file.
3. Confirm the GitHub repository is public and that every publishable package
   has a `repository.url` pointing at `https://github.com/libregrid/libregrid`.
   This is required for npm provenance.

## Release flow

The [Release workflow](../../.github/workflows/release.yml) is driven by
Changesets and has two outcomes:

1. When release changesets exist, it opens a **Version Packages** pull request.
   Review it, including the generated changelogs and package versions, then
   merge it.
2. When no changesets remain, a successful CI run on `main` runs the release
   checks and publishes every unpublished package with the `latest` dist-tag.

For the first release, open **GitHub → Actions → Release → Run workflow** and
select `main`. This creates the Version Packages pull request from the prepared
1.0.0 Changeset. Merging that pull request starts CI; after CI succeeds, the
workflow publishes the packages.

The workflow runs `npm run verify` before publishing. It uses
`NPM_CONFIG_PROVENANCE=true`, while Changesets supplies `--access public` from
the repository's Changesets configuration. This makes the initial scoped
packages public and publishes npm provenance attestations.

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

npm trusted publishers can only be configured after a package exists on the
registry. After the first release, configure each `@libregrid/*` package in
npm as a GitHub Actions trusted publisher:

- GitHub organisation: `libregrid`
- Repository: `libregrid`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

Then remove the `NPM_TOKEN` repository secret and, on each npm package's
**Publishing access** page, select **Require two-factor authentication and
disallow tokens**. The workflow already has the required GitHub OIDC
permission (`id-token: write`), and npm will use its short-lived credential
automatically.
