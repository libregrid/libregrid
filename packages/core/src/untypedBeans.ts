/**
 * Local interfaces for Community's `UntypedBeanNames` slots.
 *
 * `context.ts` reserves DI slots for enterprise beans under the comment
 * "Things used in enterprise or elsewhere that we haven't created interfaces
 * for". Those slots are typed `unknown`.
 *
 * standards.md §6 rule 1: declare local interfaces here and cast ONCE, in this
 * file only. No other package may cast an untyped bean slot.
 *
 * Each interface is added by the phase that first implements it. Keep the
 * shapes minimal — only what consumers actually call.
 */
import type { BeanCollection, ColumnChooserParams } from 'ag-grid-community';

/** Narrow an untyped `BeanCollection` slot to a declared shape. */
export function asBean<T>(value: unknown): T | undefined {
  return value as T | undefined;
}

/**
 * Read an untyped bean slot by name with a declared type.
 *
 * @example
 *   const svc = getUntypedBean<IStatusBarSvc>(this.beans, 'statusBarSvc');
 *   svc?.refresh();
 */
export function getUntypedBean<T>(beans: BeanCollection, name: string): T | undefined {
  return (beans as unknown as Record<string, unknown>)[name] as T | undefined;
}

// ---------------------------------------------------------------------------
// Declared slot shapes. Add as each phase implements its beans.
// The full reserved-name list is in api-seams.md §7.
// ---------------------------------------------------------------------------

/** Phase 4 — `statusBarSvc` */
export interface IStatusBarSvcShape {
  refresh(): void;
}

/** Phase 3 — `colChooserFactory` */
export interface IColChooserFactoryShape {
  showColumnChooser(params?: ColumnChooserParams): void;
  hideColumnChooser(): void;
}

/** Phase 7 — `ssrmStoreFactory` */
export interface ISsrmStoreFactoryShape {
  createStore(level: number): unknown;
}
