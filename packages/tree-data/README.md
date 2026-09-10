# @libregrid/tree-data

Display hierarchical records in one grid using a path for each row. Use it
for file trees, organization structures, or nested categories, with optional
managed dragging to reparent rows.

[Documentation and examples](https://libregrid.dev/tree-data)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/tree-data
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` is installed automatically. Tree data reuses its
grouping pipeline.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { TreeDataModule } from '@libregrid/tree-data';

interface FileNode {
  path: string[];
  size?: number;
}

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule]);

createGrid<FileNode>(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'size' }],
  rowData: [
    { path: ['src'] },
    { path: ['src', 'index.ts'], size: 1024 },
    { path: ['src', 'utils'] },
    { path: ['src', 'utils', 'format.ts'], size: 512 },
  ],
  treeData: true,
  getDataPath: (row) => row.path,
  groupDefaultExpanded: -1, // expand every level; use a number for that many levels
  autoGroupColumnDef: { headerName: 'File', minWidth: 280 },
});
```

Each row's `getDataPath` return value is the full path from root to that
row. LibreGrid automatically synthesizes intermediate path segments that
don't have their own data row as filler group rows.

### Drag rows to reparent

To enable managed reparenting, add `rowDragManaged: true` and
`suppressMoveWhenRowDragging: true` to the grid options, and `rowDrag: true`
to `autoGroupColumnDef`. Use stable row IDs when applying data updates.
See the [tree-data examples](https://libregrid.dev/tree-data) for the drag
workflow and the [compatibility notes](../../docs/parity/tree-data.md)
for supported path and reparenting behavior.

## API

| Export            | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `TreeDataModule`  | Registers the feature (`moduleName: 'TreeData'`).                         |
| `TreeDataService` | Bean backing `treeData` / `getDataPath` and managed row-drag reparenting. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/row-grouping`](https://github.com/libregrid/libregrid/blob/main/packages/row-grouping/README.md) — the grouping pipeline this feature builds on
- [`@libregrid/master-detail`](https://github.com/libregrid/libregrid/blob/main/packages/master-detail/README.md) — nested grids, a different way to show related records

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
