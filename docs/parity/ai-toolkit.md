# Parity — AI Toolkit

**Audited:** 2026-08-25 against `ag-grid-community@36.1.0`

**Phase:** 19 · **Design:** [AI Toolkit](../design/ai-toolkit.md) ·
**Decision:** [ADR 0007](../adr/0007-pure-ai-schema-and-byom-gateway.md)

Legend: ✅ done and tested · 🟡 partial · ❌ deliberately omitted

## Grid schema

| Requirement | Status | Evidence / boundary |
|---|---:|---|
| `AiToolkitModule` and `GridApi.getStructuredSchema(params?)` | ✅ | Community-reserved API slot; module has no beans and depends on `EnterpriseCoreModule` + `ColumnApiModule` |
| All seven `StructuredSchemaFeature` values | ✅ | Fixed order: aggregation, filter, sort, pivot, visibility, sizing, row group; capability/exclusion gated |
| Strict structured-output dialect | ✅ | closed required-all objects, nullable output decisions, typed non-empty enums, `anyOf`, root-hoisted `$defs` including `allColumnIds`, conflict tests, and full/excluded/capability golden digests |
| Live column IDs, headers/descriptions, data types, capabilities | ✅ | Bean adapter reads the live `ColumnModel`, data type, filter, aggregation, sort, pivot, grouping, and resizing services |
| `exclude`, per-column `description`, opt-in `includeSetValues` | ✅ | Schema and adapter unit coverage; set handler is not touched without explicit opt-in |
| Simple filters and exact operator arity | ✅ | text, number, bigint, date; zero/one/two operand variants; exact configured date separator; combined AND/OR condition limits; includes `startsWith` and `endsWith` |
| Set filters | ✅ | strict `values` model; opt-in live value enums with open-string fallback |
| Recursive Advanced Filter | ✅ | text/object/scalar/boolean/date/dateString/dateTime/dateTimeString leaves and recursive AND/OR joins; AG 36.1 `dateString` discriminator |
| Column sizing width/flex exclusivity | ✅ | per-column union requires exactly one non-null sizing mode |
| Empty grid / empty feature set | ✅ | valid closed root with no empty enum |
| Positional Multi Filter output | ❌ | Omitted because the approved portable dialect has no tuple semantics; advertising an approximate model would be unsafe |
| Custom filter components/options | ❌ | Omitted because a display key and arity do not communicate predicate semantics to a model |

## BYOM support beyond AG Grid's module surface

| Capability | Status | Evidence / boundary |
|---|---:|---|
| Language-neutral `libregrid.ai/v1` protocol | ✅ | TypeScript types, runtime validation, JSON Schemas, conformance fixtures, OpenAPI 3.1 |
| Browser convenience client | ✅ | request capture, HTTP/custom transport, response revalidation, diff, explicit apply, cancellation, typed errors |
| Stale-response rejection | ✅ | deterministic schema+state+context revision; unit tests mutate state before apply |
| Preserve unrelated/excluded state | ✅ | protected baseline covers every AG 36.1 `GridStateKey`; unknown nested state keys are merged back after validation; live-grid tests preserve sort, pagination, order, and filter UI state |
| Provider-neutral gateway | ✅ | standard `Request → Response` handler, provider port, limits, timeout, auth hook, normalized error and metadata-only log contracts |
| OpenAI Responses structured-output adapter | ✅ local wire tests + live battery | Exact `text.format: { type: "json_schema", strict: true }` payload and response/refusal/rate-limit parsing are unit tested; the eleven-command live battery passed against `gpt-5.6` on 2026-08-25 |
| Deterministic mock and conformance executable | ✅ | Static docs transport, gateway mock, JSON fixtures, and `libregrid-ai-conformance` |
| Runnable deployment | ✅ | Node CLI/server, health endpoint, Dockerfile health check, Compose example, environment template |
| Static docs workbench | ✅ | schema/request/prompt/envelope/response/validation/diff inspection; explicit apply; external endpoint mode; seven Chromium E2E/axe tests |
| Browser-local model | ❌ | Superseded by ADR 0007; local training artifacts remain historical and are not shipped |

## Live provider evidence

All deterministic, local integration, and live-provider evidence is green. The
owner approved egress on 2026-08-25 and the live OpenAI test passed: model
`gpt-5.6`, eleven of eleven contract commands plus the local fixture test in
36.99 s. Payloads are fully synthetic (four-column sales grid). No key or
payload was logged. An earlier attempt had been stopped before transmission;
that first stop caused no request.
