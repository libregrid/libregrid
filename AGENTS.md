# AGENTS.md

Notes for AI coding agents working in this repository.

## Remind: new-package release steps

When a pull request that **adds a new publishable package** — a new
`packages/*` workspace whose npm name is not yet on the registry — is about to
merge to `main`, or the user reports that one has merged, remind the developer
that the package's first publish **cannot happen from GitHub Actions**, and
point them at
[docs/guides/publishing.md → Adding a new package](docs/guides/publishing.md#adding-a-new-package).

The short form of the reminder:

1. First-publish manually:
   `npx nx build <name> && (cd packages/<name> && npm publish --access public)`
2. Configure the trusted publisher:
   `npm trust github @libregrid/<name> --file release.yml --repo libregrid/libregrid --allow-publish --yes`
3. Re-run the Release workflow on `main` — it publishes the rest of the
   lockstep group and cuts the tag.

Never suggest running the Release workflow with `ALLOW_NEW_PACKAGES=true` as a
workaround: tokenless OIDC publishing cannot create package names, and the
release preflight refuses that run before publishing anything.
