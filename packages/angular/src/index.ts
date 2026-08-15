/**
 * @libregrid/angular — Angular signal ergonomics for LibreGrid.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 * See package-architecture.md §5 rule 4.
 */
export { createGridApiSignals, type GridApiSignals } from './gridApiSignals';
export { createColumnDefs, defineGridOptions, withCommunityModules } from './helpers';
export { provideLibreGrid, registerLibreGridModules } from './provideLibreGrid';
