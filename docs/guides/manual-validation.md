# Manual validation

Run the focused browser validation harness from the repository root:

```sh
npm run manual:validate
```

Open the URL printed by Angular (normally `http://localhost:4200/`). Select **Manual validation**. The page links to a deterministic demo for every completed functional area. It tells you what to exercise. It stores completed checks in browser local storage. Use **Reset** to start a new pass.

The harness is a real Angular consumer of the source packages. It registers the same LibreGrid modules as the documentation app. The harness provides functional smoke testing. The automated suite remains responsible for regression and accessibility coverage.
