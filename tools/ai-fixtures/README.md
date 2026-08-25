# Historical AI training fixtures

Local Needle 2 and SmolLM2 training was paused and superseded by
[ADR 0007](../../docs/adr/0007-pure-ai-schema-and-byom-gateway.md). The current
AI Toolkit generates a strict schema from each live grid and does not ship or
train a model.

The two generator filenames remain as intentional guard commands so older
notes and automation fail with a useful architectural explanation. Historical
grid configurations and evaluation results may be retained for research, but
they are not inputs to a package build or release gate. Resuming any training
requires a new decision record and a newly designed generator that targets the
current protocol rather than the removed experimental action runtime.
