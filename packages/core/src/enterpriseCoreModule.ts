import type { Module } from 'ag-grid-community';

import { assertSingleCoreInstance } from './singletonGuard';
import { VERSION } from './version';

/**
 * The base module every LibreGrid feature module depends on.
 *
 * `moduleName` MUST be an existing literal from Community's closed `ModuleName`
 * union — see api-seams.md §3. `'EnterpriseCore'` is one of the internal/shared
 * seam literals Community already declares, so we reuse it rather than
 * inventing a name (which would not typecheck, and would break Community's
 * built-in "you need module X" validation messages).
 *
 * `version` MUST match Community's major.minor or `_registerModule` logs an
 * error — see standards.md §5. It is generated from the installed package.
 *
 * @feature LibreGrid -> Core
 */
export const EnterpriseCoreModule: Module = {
  moduleName: 'EnterpriseCore',
  version: VERSION,
  onRegister: () => {
    // Fires on every registration call and must be idempotent (iModule.ts).
    assertSingleCoreInstance();
  },
};
