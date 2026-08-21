# @libregrid/calculated-columns

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3
  - @libregrid/menu@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [982d1cd]
  - @libregrid/menu@1.2.2
  - @libregrid/core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b6836f0]
  - @libregrid/core@1.2.1
  - @libregrid/menu@1.2.1

## 1.2.0

### Minor Changes

- 192f180: Calculated columns (gap-plan A2, Phase 18): read-only derived data columns with spreadsheet-style expressions. New `@libregrid/calculated-columns` package — the `calculatedColsSvc` + `formula` bean implementations over Community's v36.1.0 seams: bracket-reference expression engine with provided functions and formula error codes, dialog-created columns with anchor placement and Grid State persistence, menu contributions, edit highlighting and the four `calculatedColumn*` events. The accessible add/edit modal includes a visual token canvas, draggable and keyboard-insertable Columns/Functions/Operators/Values palettes, movable and removable expression pills, inline literal editing, a synchronized raw formula field, and live/deferred apply modes. `@libregrid/menu` gains the `calculatedColumn` (column menu) and `calculatedColumnRemove` (context menu) default stubs.

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/core@1.2.0
