# Public demo examples

`../src/app/docs/demo-examples.ts` is the public-demo inventory. Each entry identifies one
independent viewer, its route, applicable frameworks, ordered files and initial file.
The internal benchmark is excluded. Master/detail child setup belongs in its parent's
files; the Excel export example includes both sheets because its action uses both grids.

Example files live in `../examples/`, outside the application TypeScript project.
Both Angular CLI and Nx copy that directory to `/examples/`. The viewer fetches plain
text on demand and caches successful responses; it never imports or executes source.

Run from the repository root:

```sh
node tools/docs-examples/validate.mjs
npx playwright test --config apps/docs-e2e/playwright.config.ts --project=chromium demo-viewer demo-source
```

The validator independently walks route templates to find grids without viewers,
checks inventory/file/import relationships, type-checks the plain TypeScript project,
and compiles the Angular project with strict template checking. Browser tests compare
every file with its asset, exercise the viewer and run trusted TypeScript examples in
isolated pages. `demo-viewer` also writes desktop/mobile screenshots in both themes.

To add a demo, wrap its grid and associated controls in `lgr-docs-demo`, add an inventory
entry, and author complete conventional examples for applicable frameworks. Keep
instructions outside the wrapper. Use literal sample data unless scale is essential.
Explain mock service boundaries in the example. Do not import private docs utilities.

TypeScript examples expect a bundler that resolves npm packages and TypeScript entries
(for example an existing application's bundler). Angular examples supply a standalone
component, bootstrap, template, styles and host HTML for an Angular application. Install
the packages imported by that variant. No editor, runtime or package API is added to
LibreGrid by this documentation feature.
