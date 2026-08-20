import type { SsrmSelectionOptions } from './types';

/**
 * Custom grid options declared by this package.
 *
 * `ssrmSelection` enables the feature on a grid (the app provides the
 * provider and tab identity). `ssrmSelectionViewActive` is internal: the
 * service flips it to switch the datasource contract into the
 * "Show All Selected" view (R6); apps read it in their SSRM datasource to
 * constrain results to `selected(spec) AND filterModel`.
 */
declare module 'ag-grid-community' {
  interface GridOptions {
    /** Enables `@libregrid/server-side-selection` on this grid. */
    ssrmSelection?: SsrmSelectionOptions;
    /** Internal: true while the "Show All Selected" view is active (R6). */
    ssrmSelectionViewActive?: boolean;
  }
}
