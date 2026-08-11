/**
 * @libregrid/core — shared infrastructure for LibreGrid.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 * See package-architecture.md §5 rule 4.
 */
export { EnterpriseCoreModule } from './enterpriseCoreModule';
export { assertSingleCoreInstance } from './singletonGuard';
export { asBean, getUntypedBean } from './untypedBeans';
export type { IStatusBarSvcShape, ISsrmStoreFactoryShape } from './untypedBeans';
export { VERSION } from './version';
