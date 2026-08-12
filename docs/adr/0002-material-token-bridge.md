# ADR 0002 — Material token bridge for theming

**Status:** Accepted
**Date:** 2026-08-11

---

## Context

All new LibreGrid UI uses Angular Material components. The grid's own theming API (`createTheme`, `themeQuartz.withParams(...)`) is separate from Material's token system (`mat.theme()`). Two independent theme systems in one app create visual inconsistency: the app chrome (Material) and the grid (AG Grid theme) drift apart when the user changes colour, spacing, or density.

AG Grid's own theme parameters overlap with Material tokens: `accentColor` ↔ `primary`, `backgroundColor` ↔ `surface`, `spacing` ↔ `density`, `borderRadius` ↔ `shape.corner`. Without a bridge, every app must manually keep both in sync.

## Decision

`@libregrid/material` ships a **token bridge**: a function from Material 3 tokens to AG Grid theme parameters.

```ts
import { mat } from '@angular/material/core';
import { themeQuartz } from 'ag-grid-community';
import { materialGridTheme } from '@libregrid/material';

const gridTheme = materialGridTheme(mat.defineTheme({ color: { primary: '#6750A4' } }));
// → themeQuartz.withParams({ accentColor: '#6750A4', spacing: 8, borderRadius: 4 })
```

The bridge:
- Reads Material tokens at theme-definition time (not runtime)
- Maps `primary` → `accentColor`, `surface` → `backgroundColor`, density → `spacing`, shape → `borderRadius`
- Returns a callable that accepts overrides, so the user can still fine-tune

## Consequences

- One-source-of-truth theming for apps using both Material and LibreGrid
- The bridge is a convenience, not a requirement — users can still call `themeQuartz.withParams(...)` directly
- Kept in `@libregrid/material` (an Angular package), not in core, so Angular remains optional
