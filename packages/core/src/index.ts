/**
 * @libregrid/core — shared infrastructure for LibreGrid.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 * See package-architecture.md §5 rule 4.
 */
export { EnterpriseCoreModule } from './enterpriseCoreModule';
export { iconSvg } from './iconSvg';
export { inheritThemeTokens } from './themeTokens';
export { assertSingleCoreInstance } from './singletonGuard';
export { asBean, getUntypedBean } from './untypedBeans';
export type { IColChooserFactoryShape, IStatusBarSvcShape, ISsrmStoreFactoryShape, IToolbarSvcShape } from './untypedBeans';
export { VERSION } from './version';
