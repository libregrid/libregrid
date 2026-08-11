import { VERSION } from './version';

/**
 * Duplicate-instance guard — package-architecture.md §7.
 *
 * `@libregrid/core` holds bean classes and the `EnterpriseCore` module object.
 * Two copies in one application means two distinct class identities and two
 * module objects registering under the same `moduleName`; the second overwrites
 * the first in `ModuleRegistry`'s store, producing bean mismatches that are
 * extremely hard to diagnose.
 *
 * This is the same hazard `ag-grid-community` has ("two copies breaks the
 * module registry") and it applies to us for the same reason.
 *
 * Fail loudly rather than mysteriously.
 */
const INSTANCE_KEY = Symbol.for('libregrid.core.instance');

interface GlobalWithGuard {
  [INSTANCE_KEY]?: string;
}

/** @returns true if this is the first (or a consistent) instance. */
export function assertSingleCoreInstance(
  version: string = VERSION,
  scope: GlobalWithGuard = globalThis as GlobalWithGuard,
  warn: (msg: string) => void = (m) => console.warn(m),
): boolean {
  const existing = scope[INSTANCE_KEY];
  if (existing !== undefined && existing !== version) {
    warn(
      `[LibreGrid] Two copies of @libregrid/core detected (${existing} and ${version}). ` +
        `LibreGrid will not work correctly — deduplicate your install. ` +
        `All @libregrid/* packages must resolve to a single core version. ` +
        `See docs/reference/package-architecture.md §7.`,
    );
    return false;
  }
  scope[INSTANCE_KEY] = version;
  return true;
}

export { INSTANCE_KEY as _CORE_INSTANCE_KEY };
