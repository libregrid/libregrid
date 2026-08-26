# AI gateway hosting

The docs site serves the AI gateway from Cloud Run on its own origin. Firebase
Hosting sends `/v1/grid-command` to the Cloud Run service. The browser sees one
origin, so the gateway needs no CORS header. The demo keeps the same
security model that the published packages describe.

## Rewrite order

Firebase reads the `rewrites` array in order and uses the first match. The
`**` rule matches every path. Put the `/v1/grid-command` rule before it. A rule
placed after `**` never runs.

## Build the container

`gcloud run deploy --source packages/ai-gateway` does not work. The Dockerfile
copies `package.json`, `nx.json`, `tsconfig.base.json`, `tools`, and `packages`
from the build context root. The context must be the repository root, not the
package directory.

Build from the repository root with `cloudbuild.yaml`:

```sh
gcloud builds submit \
  --project=libregrid \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE=us-central1-docker.pkg.dev/libregrid/libregrid/ai-gateway:v1 \
  .
```

Create the Artifact Registry repository once, before the first build:

```sh
gcloud artifacts repositories create libregrid \
  --project=libregrid \
  --repository-format=docker \
  --location=us-central1
```

A `.gcloudignore` file in the repository root excludes `node_modules`, `.git`,
build output, and `.secrets` from the upload. `gcloud builds submit` does not
read `.gitignore`. Without `.gcloudignore`, the upload ships gigabytes of local
build artifacts. Worse, it could ship a secret file that Git ignores but
`gcloud` does not.

## Deploy

```sh
gcloud run deploy libregrid-ai-gateway \
  --project=libregrid \
  --image=us-central1-docker.pkg.dev/libregrid/libregrid/ai-gateway:v1 \
  --region=us-central1 \
  --service-account=libregrid-ai-gateway@libregrid.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=20 \
  --timeout=60s \
  --set-env-vars=AI_PROVIDER=openai-chat,OPENAI_BASE_URL=https://openrouter.ai/api/v1,OPENAI_MODEL=nvidia/nemotron-3-super-120b-a12b:free,OPENROUTER_REQUIRE_PARAMETERS=true,HOST=0.0.0.0,OPENROUTER_REFERER=https://libregrid.dev,OPENROUTER_TITLE=LibreGrid\ Docs \
  --set-secrets=OPENAI_API_KEY=libregrid-openrouter-key:latest
```

`--service-account` is required. Without it Cloud Run uses the default compute
service account. That account holds `roles/editor` on the whole project. A
public endpoint must not run with project-wide Editor.

`--allow-unauthenticated` is required. Firebase Hosting calls the service
without a Google identity. Task 6 adds the Turnstile guard for real access
control. Keep `--max-instances` low until that guard carries a real secret.

`--min-instances 0` lets the service scale to zero. An idle demo costs
nothing.

## Secrets

Never write a key into `firebase.json`, the Dockerfile, or any committed file.

```sh
gcloud secrets create libregrid-openrouter-key --project=libregrid --replication-policy=automatic
printf '%s' 'sk-or-v1-your-key' | gcloud secrets versions add libregrid-openrouter-key --project=libregrid --data-file=-
```

The `printf` form avoids a trailing newline in the secret value and keeps the
key out of shell history when the shell ignores leading-space commands.

### Runtime service account

Create a dedicated runtime identity once. Do not use the default compute
service account. That account holds `roles/editor` on the whole project.

```sh
gcloud iam service-accounts create libregrid-ai-gateway \
  --project=libregrid \
  --display-name="LibreGrid AI Gateway (Cloud Run runtime)"
```

Give it no project-level role. Grant it read access to each secret only:

```sh
gcloud secrets add-iam-policy-binding libregrid-openrouter-key \
  --project=libregrid \
  --member="serviceAccount:libregrid-ai-gateway@libregrid.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Current deployment state

The service runs today with a **placeholder** secret value, not a real
OpenRouter key. `/health` works and proves the whole Firebase → Cloud Run
path. Any real model call returns a provider authentication error until the
project owner replaces the secret value with a real OpenRouter key.

This is deliberate. It proves the infrastructure without letting the
unguarded endpoint spend money. There is no Turnstile secret either.
`TURNSTILE_SECRET_KEY` stays unset, so the gateway logs `turnstile disabled`
and the guard stays off. The owner must add both secrets before the demo is
safe to leave open to the public internet.

## Roll back

List the revisions, then send all traffic to the last good one:

```sh
gcloud run revisions list --service libregrid-ai-gateway --region us-central1 --project=libregrid
gcloud run services update-traffic libregrid-ai-gateway \
  --region us-central1 --project=libregrid --to-revisions <revision-name>=100
```

## Cost control

The service holds a provider key slot, so cap the blast radius:

- `--min-instances 0` lets the service scale to zero. An idle demo costs
  nothing.
- `--max-instances 3` and `--concurrency 20` cap the burst.
- Set a Google Cloud billing budget alert on the project.
- Review OpenRouter usage weekly for the first month after launch.

Open action B5 tracks this.

## Health

The health endpoint is for operators. It is not published on the docs origin.
Reach it on the Cloud Run service URL:

```sh
curl -s "$(gcloud run services describe libregrid-ai-gateway \
  --region us-central1 --project=libregrid --format='value(status.url)')/health"
```
