# @libregrid/core

Shared infrastructure that every LibreGrid feature package builds on. It
provides the base `EnterpriseCoreModule` every feature module depends on. It
provides a guard against duplicate installs. It provides typed helpers for
reading AG Grid Community's untyped enterprise bean slots.

You will rarely install or import this package directly. Every
`@libregrid/*` feature package declares it as a regular dependency. npm
installs it automatically when you install any feature package.

## Install

```bash
npm install ag-grid-community @libregrid/core
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. In practice
you install a feature package instead (e.g. `@libregrid/row-grouping`). You
get `@libregrid/core` transitively.

## Usage

### You usually don't need to do anything

Every feature module declares `dependsOn: [EnterpriseCoreModule]`. AG Grid
Community's module registry resolves `dependsOn` recursively. Registering a
feature module also registers `EnterpriseCoreModule`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

// EnterpriseCoreModule is pulled in automatically via RowGroupingModule.dependsOn
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);
```

Registering `EnterpriseCoreModule` explicitly alongside your feature modules
is harmless and sometimes clearer. The LibreGrid docs app does this:

```ts
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, RowGroupingModule]);
```

### Writing a custom module or bean (advanced)

If you're extending LibreGrid — writing your own module that plugs into the
same bean slots — depend on `@libregrid/core` directly. Read AG Grid's
untyped "enterprise" bean slots through the typed helpers instead of casting
with `as any`:

```ts
import { getUntypedBean, type IStatusBarSvcShape } from '@libregrid/core';

// Inside a bean with access to `this.beans`:
const statusBar = getUntypedBean<IStatusBarSvcShape>(this.beans, 'statusBarSvc');
statusBar?.refresh();
```

### Diagnosing "two copies of @libregrid/core" warnings

If your bundler resolves two different versions of `@libregrid/core` (usually
from a mismatched lockfile), LibreGrid warns at runtime instead of failing
silently with mismatched beans. Deduplicate the install (`npm dedupe` or
aligning versions) to resolve it. Every `@libregrid/*` package must resolve
to a single `@libregrid/core` instance.

## API

| Export | Purpose |
| --- | --- |
| `EnterpriseCoreModule` | Base `Module` every feature module depends on. |
| `assertSingleCoreInstance()` | Runtime guard that warns if two `@libregrid/core` versions are loaded. |
| `asBean<T>(value)` | Narrows an untyped bean value to a declared shape. |
| `getUntypedBean<T>(beans, name)` | Reads an untyped `BeanCollection` slot by name with a declared type. |
| `IColChooserFactoryShape`, `IStatusBarSvcShape`, `ISsrmStoreFactoryShape` | Declared shapes for AG Grid Community's untyped enterprise bean slots. |

See [`docs/reference/api-seams.md`](https://github.com/libregrid/libregrid/blob/main/docs/reference/api-seams.md)
for the full bean and module architecture.

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [Migration guide](https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md)

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
