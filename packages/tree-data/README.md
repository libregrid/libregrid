# @libregrid/tree-data

Hierarchical row data from a flat array with a path per row, and managed
reparenting when rows are dragged into a new group.

Replaces AG Grid Enterprise's `TreeData` module.

## Install

```bash
npm install ag-grid-community @libregrid/tree-data
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` is installed automatically. Tree data reuses its
grouping pipeline.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { TreeDataModule } from '@libregrid/tree-data';

interface FileNode {
  path: string[];
  size?: number;
}

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule]);

createGrid<FileNode>(document.querySelector('#grid')!, {
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

```ts
createGrid(document.querySelector('#grid')!, {
  // ...
  rowDragManaged: true,
  suppressMoveWhenRowDragging: true,
  autoGroupColumnDef: { headerName: 'File', rowDrag: true, minWidth: 280 },
});
```

## API

| Export | Purpose |
| --- | --- |
| `TreeDataModule` | Registers the feature (`moduleName: 'TreeData'`). |
| `TreeDataService` | Bean backing `treeData` / `getDataPath` and managed row-drag reparenting. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/row-grouping`](https://github.com/libregrid/libregrid/blob/main/packages/row-grouping/README.md) — the grouping pipeline this feature builds on
- [`@libregrid/master-detail`](https://github.com/libregrid/libregrid/blob/main/packages/master-detail/README.md) — nested grids, a different way to show related records

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
