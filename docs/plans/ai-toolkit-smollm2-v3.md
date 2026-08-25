# AI Toolkit SmolLM2 v3 Training and Runtime Plan

**Status:** paused and superseded — do not resume training

**Decision date:** 2026-08-24

**Training hosts:** `gx10-5b93` and `gx10-7306`

**Cold browser bundle ceiling:** 125 MB

> Superseded on 2026-08-25 by
> [`ai-toolkit-structured-schema.md`](./ai-toolkit-structured-schema.md). The
> AI Toolkit is now planned as a pure schema-generation module. Model training,
> selection, quantization, and inference are deferred to a separately approved
> assistant package. The results below remain historical evidence and must not
> be treated as an active training plan.

## Outcome

Replace the unreliable Needle 2 experiment only if a fine-tuned
`HuggingFaceTB/SmolLM2-135M-Instruct` passes adversarial, held-out-schema
evaluation after merge, quantization, and browser inference. Needle remains the
default until every gate passes.

The package cannot know an application's domain or column names ahead of time.
Each request therefore carries a canonical, versioned snapshot containing the
complete model-relevant grid contract: column IDs and headers, types,
descriptions and synonyms, available filter operators, sort and visibility
capabilities, current filters/sort/order/visibility, pagination and row counts,
density, row height, and developer-supplied scalar facts.

## Runtime contract

- One renderer supplies identical system and user messages to corpus
  generation, browser inference, evaluation, and the Docs lab.
- Columns use request-local references (`c0`, `c1`, …); model output never gets
  to address an arbitrary real `colId` directly.
- The only response shape is `{"actions":[...]}` with no prose.
- A filter condition owns an `operands` array. `arguments` exists only on its
  outer action. This distinction is validated, not repaired heuristically.
- Unknown references, unsupported operators, invalid scalar types, oversized
  plans, and stale grid revisions fail closed before AG Grid state changes.
- Context-only facts such as density and current page cannot be mutated until a
  corresponding validated action is deliberately added.

## Corpus v3

Generate labels deterministically from the production LibreGrid decoder and
validator; no language model writes ground truth.

| Split                 |   Rows | Whole-grid schemas |
| --------------------- | -----: | -----------------: |
| Train                 | 48,000 |                800 |
| Validation            |  6,000 |                100 |
| Test                  |  6,000 |                100 |
| Adversarial challenge |    300 |                 15 |

Required invariants:

- whole-grid split isolation, including headers, raw IDs, lexical operands,
  template families, and normalized surface templates;
- all Advanced Filter operators in every ordinary split, including
  `startsWith`, `endsWith`, blank/not-blank, ranges, and set membership;
- at least 50% non-default snapshots and 25% state-dependent commands;
- compound filters, filter/sort/visibility combinations, state edits, resets,
  unsupported requests, OR/ambiguity negatives, and non-grid negatives;
- the exact three-condition sales/North America/hardware request in the sealed
  challenge suite;
- every rendered record below the 2,048-token training ceiling.

The generator emits `manifest.json` plus `SHA256SUMS`. Both Sparks must verify
the same bytes before training.

## Two-Spark training

- PyTorch DDP, two nodes, one GB10 process per node.
- QSFP/RoCE only: rendezvous on `192.168.0.250`, interface
  `enp1s0f0np0`, NCCL HCAs `rocep1s0f0:1` and `roceP2p1s0f0:1`.
- Abort if QSFP is unavailable; do not silently use the 1 Gb management NIC.
- Rank-16 LoRA, alpha 32, dropout 0.05, completion-only loss, bf16, one epoch,
  global batch 16, cosine schedule, 3% warmup, and a fresh base model.
- Save/evaluate every 600 steps. Retain checkpoints so a failed run is
  diagnosable and resumable, but do not continue training an overfit v2
  adapter.
- Before the full run, require identical package versions, CUDA smoke tests,
  corpus checksums, a full tokenization dry run, and a successful NCCL
  all-reduce benchmark over the pinned QSFP transport.

## Acceptance gates

Training loss is diagnostic only. Score deterministic generation on unseen
schemas through LibreGrid's actual decoder and validator.

- strict JSON rate: at least 99%;
- decoded and contract-valid plans: at least 99%;
- exact complete action match: at least 95%;
- negative/off-topic exact behavior: at least 99%;
- each represented filter operator: at least 90% exact;
- adversarial challenge exact match: at least 90%;
- no meaningful regression after LoRA merge, q4f16 ONNX export, or WebGPU/WASM
  browser execution;
- complete cold browser model bundle no larger than 125 MB.

If a gate fails, retain the evaluation artifacts and classify failures by
schema grounding, state use, operator, action composition, JSON shape, and
quantization. Change the corpus or training recipe based on that evidence; do
not add epochs merely because loss can fall further.

## Result and next experiment (2026-08-25)

V3 was rejected. The best challenge score was only 18.0% exact and the first
300 held-out test rows were 49.7% exact. The generator randomized names but
leaked type and capability through reference position (`c0` was always text,
`c1` number, `c2` date, `c3` boolean); 42.5% of training filter targets were
`c0`. The challenge changed that ordering and exposed the shortcut.

Before another full run, permute type/role/reference position, balance target
references, train synonym/description grounding, compact the repeated action
grammar, and gate a small pilot. A zero-shot validator-guided cleanup pass was
also rejected (2/20 exact versus 3/20 one-pass). If two-round inference is
pursued, train separate tagged grounding and audit/compile tasks and always give
round two the original command, snapshot, draft, and deterministic findings.

## Two-pass pilot result (2026-08-25)

The explicitly trained two-pass pilot was also rejected. A fresh rank-16
SmolLM2 adapter was trained on the local RTX 5090 for two epochs using 2,220
balanced, position-permuted scenarios expanded into 4,440 tagged turns. The
held-out validation loss improved monotonically to 0.05237 without collapsing
to zero, but behavioral generalization remained poor on the 300-row remapped
challenge.

| Policy | Strict JSON | Contract valid | Exact | Correct negatives |
| --- | ---: | ---: | ---: | ---: |
| Pass-one intent, deterministic compile | 99.7% | 87.3% | 17.7% | 57.8% |
| Unconditional learned cleanup | 98.0% | 78.7% | 14.7% | 42.2% |
| Cleanup only after structural findings | 100.0% | 91.7% | 17.7% | 57.8% |

The learned cleanup changed 193 of 300 drafts, improving 12 exact results while
degrading 18. It therefore cannot run unconditionally. Deterministic compilation
and production validation remain authoritative, with fail-closed behavior.

Before another model training round, add deterministic mention-to-column hints
from exact headers, IDs, synonyms, and descriptions; expand the
position-permuted semantic grounding corpus; and test a single grounded pass on
this same challenge. Do not add more epochs or scale the free-form cleanup task
based on loss alone. If those grounding aids still fail, compare another edge
architecture within the browser-size budget.
