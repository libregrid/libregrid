# @libregrid/core

Shared module infrastructure and typed integration helpers used by LibreGrid
feature packages. Applications normally receive this package as a dependency
and register feature modules instead of importing core directly.

[Documentation and examples](https://libregrid.dev/getting-started) · [API reference](https://libregrid.dev/api)

## Install

For an application, install a feature package such as
[`@libregrid/row-grouping`](../row-grouping/README.md); it brings in core
automatically. Install core directly when building your own integration:

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/core
```

Requires `ag-grid-community >=36.1.0 <37`. Keep LibreGrid packages on the
same release version so they resolve one core instance.

## Usage

A feature module declares its core dependency. AG Grid resolves module
dependencies recursively, so applications do not need a separate core
registration. For example, after installing the row-grouping package:

```ts
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);
```

Core alone does not enable grouping, filtering, or other advanced features.
For grid creation and Angular bootstrap, follow the
[project quick starts](../../README.md#typescript-quick-start).

## Integration helpers

| Export                           | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `EnterpriseCoreModule`           | Shared module dependency for LibreGrid features   |
| `assertSingleCoreInstance()`     | Warn when duplicate core instances are loaded     |
| `asBean<T>(value)`               | Declare the expected type of an integration value |
| `getUntypedBean<T>(beans, name)` | Read an untyped bean slot using a declared shape  |

The typed helpers declare an expected shape; they do not perform runtime
validation. These are advanced integration APIs. Application code normally uses
`GridApi` and feature options instead. See the
[module and bean architecture](../../docs/reference/api-seams.md) before
building a custom module.

## Duplicate installations

If the runtime reports more than one core instance, inspect your dependency
tree with `npm ls @libregrid/core`. Align LibreGrid versions and use `npm dedupe`
where appropriate. If a linked package bundles its own core copy, configure its
build to share the application's dependency.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
