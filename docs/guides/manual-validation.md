# Manual validation

Run the focused browser validation harness from the repository root:

```sh
npm run manual:validate
```

Open the URL printed by Angular (normally `http://localhost:4200/`) and select **Manual validation**. The page links to a deterministic demo for every completed functional area, tells you what to exercise, and stores completed checks in browser local storage. Use **Reset** to start a new pass.

The harness is a real Angular consumer of the source packages and registers the same LibreGrid modules as the documentation app. It is intended for functional smoke testing; the automated suite remains responsible for regression and accessibility coverage.
