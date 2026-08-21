# Firebase Hosting launch guide

The documentation application is a static Angular single-page application. Firebase Hosting serves `apps/docs/dist/browser`; the rewrite in [`firebase.json`](../firebase.json) lets Angular handle direct requests to documentation and policy routes.

## Local and preview deployment

```sh
npm -w apps/docs run build
firebase emulators:start --only hosting
firebase hosting:channel:deploy preview
```

Deploy production after reviewing the preview:

```sh
npm -w apps/docs run build
firebase deploy --only hosting
```

## Custom domain

In Firebase Console, open **Hosting → Add custom domain** and enter `libregrid.dev`, then add the DNS records Firebase provides. Complete certificate provisioning before redirecting any existing domain traffic. Add `www.libregrid.dev` only if it should redirect to the canonical root domain.

## Privacy and analytics launch checklist

- Review `/privacy` and `/cookies` for the live service and publish the actual effective date.
- In Google Analytics, disable advertising features, Google Signals, User-ID, and BigQuery export; set and record the selected retention period.
- Review Google/Firebase data-processing terms and transfer safeguards for the applicable jurisdiction.
- Confirm that Analytics network traffic and `_ga`-family cookies are absent before consent, appear only after acceptance, and stop after withdrawal.
- Confirm the footer’s **Privacy choices** control opens the consent dialog and that accept and reject are equally available.
- Set Firebase/Google Cloud budget alerts and review Hosting usage before launch.

## Klaro vendor source

The docs app vendors the supplied Klaro 0.7.22 browser builds (BSD-3-Clause) under `apps/docs/src/assets/vendor/klaro`. Its `klaro-no-css.js` build is emitted as `/assets/vendor/klaro/klaro-no-css.js`; `klaro.min.css` is bundled as a first-party application stylesheet and overridden by the Azure Material theme in `apps/docs/src/styles.scss`.
