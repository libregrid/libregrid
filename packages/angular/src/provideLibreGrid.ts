import {
  APP_INITIALIZER,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import { ModuleRegistry, type Module } from 'ag-grid-community';

/**
 * Registers LibreGrid modules into the shared AG Grid module registry.
 *
 * Registration is idempotent; the same module may be provided by several
 * features without effect.
 *
 * @feature Angular integration
 */
export function registerLibreGridModules(modules: Module[]): void {
  ModuleRegistry.registerModules(modules);
}

/**
 * Application-level provider that registers LibreGrid modules before the app
 * bootstraps, so every ag-grid-angular grid in the application shares one
 * registration.
 *
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideLibreGrid(RowGroupingModule, ColumnsToolPanelModule),
 *   ],
 * };
 * ```
 *
 * @feature Angular integration
 */
export function provideLibreGrid(...modules: Module[]): EnvironmentProviders {
  const frozen = [...modules];
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        registerLibreGridModules(frozen);
        return () => undefined;
      },
    },
  ]);
}
