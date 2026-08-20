# AG Grid Site Inventory (ag-grid.com, Angular docs, v36.1.0)

> **Research notes.** Fetched and analysed **2026-08-18** from the public
> https://www.ag-grid.com site (Angular section, docs **version 36.1.0** — the version
> shown in every page header, and the same baseline LibreGrid peers on).
> Every claim below is grounded in a fetched page; URLs are given inline.
> This file inventories what the site offers and how the site classifies each feature
> as Community or Enterprise. It is a source of record for
> [`ENTERPRISE-GAP-PLAN.md`](../../ENTERPRISE-GAP-PLAN.md).

---

## 1. Method — how the site marks Enterprise

Four independent mechanisms on the site identify Enterprise features; all were
fetched and cross-checked:

1. **Per-page `isEnterprise` flag (primary).** Every docs page embeds a `Header`
   web-component (`astro-island`) whose JSON `props` carry `title`, `path`,
   `isEnterprise` and `version` for the page itself. All 295 docs pages were fetched
   and flagged: **154 Enterprise, 141 Community**.
2. **Docs navigation tree (cross-check).** The same `Header` props carry `menuItems`,
   the complete docs nav; each nav item may carry its own `isEnterprise`. 290 nav
   items: **140 Enterprise**. Cross-referencing page flags against nav flags for the
   275 items that have both: only 3 disagreements (see §8).
3. **In-content `(e)` badges.** The [Community vs Enterprise](#3-community-vs-enterprise)
   page states: _"All Enterprise features are marked with an (e) in our docs."_ The
   badge markup is `<span class="_enterpriseIcon…">(e)</span>` attached to headings.
   In fetched pages it appears inside content on a handful of pages (e.g. the
   "Enterprise Features" section on [Key Features](https://www.ag-grid.com/angular-data-grid/key-features/),
   "Server-Side (e)" and "Viewport (e)" on [Row Models](https://www.ag-grid.com/angular-data-grid/row-models/),
   "Editable Header Name (e)" on [Column Headers](https://www.ag-grid.com/angular-data-grid/column-headers/),
   "Using the Quick Access Toolbar (e)" on [Quick Filter](https://www.ag-grid.com/angular-data-grid/filter-quick/)).
4. **API-reference module metadata.** The `ApiDocumentation` /
   `InterfaceDocumentation` islands on docs pages tag every `@agModule` reference with
   `isEnterprise`. Collected from all fetched pages: **67 modules — 32 Enterprise,
   35 Community** (§7). This is the module-level view, directly comparable to
   LibreGrid's module seams.

Additionally, the [Pricing page](https://www.ag-grid.com/license-pricing/) (linked from
Community vs Enterprise as the full feature comparison) renders a static
**65-row Community / Enterprise / Enterprise-Bundle comparison table** (§6).

### Fetch details

- 296 URLs fetched 2026-08-18 (295 `/angular-data-grid/<page>/` pages + `/license-pricing/`),
  all **HTTP 200**. The site sits behind CloudFront and returns **403 to non-browser
  user agents**; a browser `User-Agent` header is required.
- Pages are Astro-rendered; body content in `<article>`, ~0.5 MB each.
- The pricing page uses a different layout (no `Header` island); its comparison rows
  were parsed from the static HTML (`_row_…` divs: label + three status cells).

---

## 2. Angular getting-started (deep dive)

Source: [Getting Started](https://www.ag-grid.com/angular-data-grid/getting-started/) — fetched 2026-08-18.

The page's six-step quick start:

1. **Install** — `npm install ag-grid-angular`, which "also installs
   `ag-grid-community`".
2. **Register modules** — register `AllCommunityModule` to access all Community
   features:

   ```ts
   import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
   ModuleRegistry.registerModules([AllCommunityModule]);
   ```

   with the note: "To minimize bundle size, only register the modules you want to
   use. See the Modules page for more information."
3. **Import the component** — `import { AgGridAngular } from 'ag-grid-angular';`
   plus `import type { ColDef } from 'ag-grid-community';`.
4. **Define rows and columns** — `rowData` array + `colDefs: ColDef[]`
   (the page's example uses `field`-based column definitions: `make`, `model`,
   `price`, `electric`).
5. **Use the component** — standalone component with
   `imports: [AgGridAngular]` and template
   `<ag-grid-angular [rowData]="rowData" [columnDefs]="colDefs" />`.
6. **Live example** with CodeSandbox/Plunker buttons.

**Next steps** offered by the page: Key Features, Tutorials, Community vs. Enterprise.

The page is feature-agnostic: it shows no Enterprise feature and no licence step.

---

## 3. Community vs Enterprise

Source: [Community vs Enterprise](https://www.ag-grid.com/angular-data-grid/community-vs-enterprise/) — fetched 2026-08-18.

- **Community** (per the page): configuration, sorting, filtering, pagination,
  cell rendering, themes, accessibility, row and column virtualization, and the
  React/Angular/Vue/vanilla framework integrations.
- **Enterprise** highlights listed on the page: Server-Side Row Model,
  Excel Export (with styles and formulas), Pivot Tables & Aggregations,
  Range Selection, Integrated Charts, Master/Detail, Row Grouping &
  Multi-Column Sorting, Clipboard, Tool Panels, Custom Context Menu & Sidebars.
  This is a *highlights* list, not exhaustive — the page itself points to the
  Pricing page for the full comparison and to the `(e)` doc markers.
- **Enterprise Bundle** = AG Charts Enterprise **plus** Integrated Enterprise
  Charts; the page notes that Integrated Charts without the bundle provides only
  the Integrated *Community* chart types.
- The page documents the `(e)` convention (§1.3) and links to the
  30-day Enterprise Bundle trial.

## 4. Modules

Source: [Modules](https://www.ag-grid.com/angular-data-grid/modules/) — fetched 2026-08-18.

- Two bundles: `AllCommunityModule` (all Community modules) and
  `AllEnterpriseModule` (AllCommunityModule + all Enterprise modules), imported
  from `ag-grid-community` / `ag-grid-enterprise` respectively. Registering one
  bundle "replicates the behaviour of the package versions of AG Grid prior to
  version 33".
- For Integrated Charts / Sparklines the charts module must be passed explicitly:
  `ModuleRegistry.registerModules([AllEnterpriseModule.with(AgChartsEnterpriseModule)])`.
- A **Module Selector** tool on the page generates registration code from the
  features you pick; modules can also be provided to individual grids rather than
  globally.
- **`enableDevValidations()`** — development-time validations (full console
  messages, on-grid overlay, throw/suppress options). The page states these are
  **not part of the AllCommunity/AllEnterprise bundles** and must be enabled
  yourself; recommended only in development builds.
- Registration examples on the page pair Community and Enterprise modules, e.g.
  `ClientSideRowModelModule, CsvExportModule` (community) with
  `ExcelExportModule, MasterDetailModule` (enterprise) — consistent with §7.

## 5. Row models

Source: [Row Models](https://www.ag-grid.com/angular-data-grid/row-models/) — fetched 2026-08-18.

Four row models are documented; the page's `(e)` badges mark:

| Row model | Marking |
| --- | --- |
| Client-Side (default) | Community |
| Server-Side | **(e)** |
| Viewport | **(e)** |
| Infinite | Community |

Infinite, Viewport and Server-Side all use a datasource; Client-Side does not.
Pagination applies to any row model.

## 6. Pricing page — full feature comparison

Source: [Licence and Pricing](https://www.ag-grid.com/license-pricing/) — fetched 2026-08-18.

The page's comparison table (65 rows; C/E/B = Community / Enterprise / Enterprise
Bundle; yes = included, — = not included):

| Feature | C | E | B | Section on page |
| --- | --- | --- | --- | --- |
| MCP Server | yes | yes | yes | AI Features |
| AI Toolkit | — | yes | yes | AI Features |
| Sparklines | — | yes | yes | Charting |
| Integrated Charts | — | — | yes | Charting |
| AG Charts Enterprise | — | — | yes | Charting |
| Headers / Groups / Sizing / Moving / Pinning / Spanning / Auto-Generate Columns | yes | yes | yes | Columns |
| Calculated Columns | — | yes | yes | Columns |
| Text / Number / Date / Quick / External Filter | yes | yes | yes | Filtering |
| Set Filter | — | yes | yes | Filtering |
| Multi Filter | — | yes | yes | Filtering |
| Advanced Filter | — | yes | yes | Filtering |
| Row Selection | yes | yes | yes | Selection |
| Row Numbers | — | yes | yes | Selection |
| Cell Range Selection | — | yes | yes | Selection |
| Fill Handle | — | yes | yes | Selection |
| Formulas | — | yes | yes | Cells |
| Find | — | yes | yes | Cells |
| Cell Notes | — | yes | yes | Cells |
| Text / Number / Date / Checkbox / Large Text / Select Editor | yes | yes | yes | Cell Editing |
| Batch Editing | — | yes | yes | Cell Editing |
| Undo / Redo | yes | yes | yes | Cell Editing |
| Advanced Select Editor | — | yes | yes | Cell Editing |
| CSV Export | yes | yes | yes | Import & Export |
| Excel Export | — | yes | yes | Import & Export |
| Clipboard Operations | — | yes | yes | Import & Export |
| Drag & Drop | yes | yes | yes | Import & Export |
| Aggregation / Row Grouping / Pivoting / Tree Data / Master Detail | — | yes | yes | Group & Pivot |
| Sorting / Filtering / Selection / Pagination | yes | yes | yes | Server-side Data (basic) |
| Row Grouping / Pivoting / Tree Data / Master Detail / Transactions | — | yes | yes | Server-side Data (advanced) |
| Column Menu / Context Menu / Columns Tool Panel / Filters Tool Panel / Status Bar | — | yes | yes | Accessories |
| Accessibility / Localisation / Custom Components | yes | yes | yes | Miscellaneous |
| Enterprise Support | — | yes | yes | Support |
| Perpetual License | — | yes | yes | Support |

Notable: **Integrated Charts and AG Charts Enterprise appear only in the Bundle
column**, matching the Community vs Enterprise bundle note (§3). Undo/Redo,
Drag & Drop, CSV export, spanning and the basic cell editors are Community rows.

---

## 7. Module-level classification (API metadata)

From the `@agModule … isEnterprise` tags in the fetched pages' API-reference
metadata (67 modules referenced; not guaranteed to be the complete v36 module set):

**Enterprise (32):** `AdvancedFilterModule`, `AiToolkitModule`, `BatchEditModule`,
`CalculatedColumnsModule`, `CellSelectionModule`, `ClipboardModule`,
`ColumnHeaderEditModule`, `ColumnMenuModule`, `ColumnsToolPanelModule`,
`ContextMenuModule`, `ExcelExportModule`, `FindModule`, `FormulaModule`,
`IntegratedChartsModule`, `MasterDetailModule`, `MultiFilterModule`, `NotesModule`,
`PivotModule`, `RichSelectModule`, `RowGroupingEditModule`, `RowGroupingModule`,
`RowGroupingPanelModule`, `RowNumbersModule`, `ServerSideRowModelApiModule`,
`ServerSideRowModelModule`, `SetFilterModule`, `ShowValuesAsModule`, `SideBarModule`,
`StatusBarModule`, `ToolbarModule`, `TreeDataModule`, `ViewportRowModelModule`

**Community (35):** `AlignedGridsModule`, `CellApiModule`, `CellStyleModule`,
`CheckboxEditorModule`, `ClientSideRowModelApiModule`, `ClientSideRowModelModule`,
`ColumnApiModule`, `ColumnAutoSizeModule`, `CsvExportModule`, `CustomEditorModule`,
`CustomFilterModule`, `DateEditorModule`, `DateFilterModule`, `DragAndDropModule`,
`ExternalFilterModule`, `HighlightChangesModule`, `InfiniteRowModelModule`,
`LargeTextEditorModule`, `LocaleModule`, `NumberEditorModule`, `NumberFilterModule`,
`PaginationModule`, `PinnedRowModule`, `QuickFilterModule`, `RenderApiModule`,
`RowApiModule`, `RowDragModule`, `RowSelectionModule`, `RowStyleModule`,
`SelectEditorModule`, `TextEditorModule`, `TextFilterModule`, `TooltipModule`,
`UndoRedoEditModule`, `ValueCacheModule`

---

## 8. Enterprise feature inventory (154 pages)

All pages below are flagged `isEnterprise: true` on their own page (§1.1).
URLs: https://www.ag-grid.com/angular-data-grid/<slug>/. Descriptions are the pages' own meta descriptions (abridged).

| Page | Title | Description (site meta) |
| --- | --- | --- |
| `ai-toolkit` | AI Toolkit | Easily integrate your LLM into AG Grid to control Grid State via natural language by leveraging the new AI Toolkit APIs to generate structured outputs. |
| `column-menu` | Column Menu | The column menu is launched from the grid header, and displays a list of menu items, along with the ability to select columns and display filters. |
| `component-menu-item` | Menu Item Component | Menu Item Components allow you to customise the menu items shown in the   and  . Use these when the provided menu items do not meet your requirements. |
| `context-menu` | Context Menu | The user can bring up the context menu by right clicking on a cell. By default, the context menu shows  ,  ,   and   menu items (if the relevant   are loaded). |
| `status-bar` | Status Bar | The Status Bar appears below the grid and contains Status Bar Panels. Panels can be Grid Provided Panels or Custom Status Bar Panels. |
| `toolbar` | Quick Access Toolbar | The Toolbar appears above the grid and provides quick access to common grid actions. It supports built-in items such as quick filter and find, dropdown menus, a |
| `component-tool-panel` | Tool Panel Component | Custom Tool Panel Components can be included into the grid's Side Bar. Implement these when you require more Tool Panels to meet your application requirements. |
| `side-bar` | Side Bar | This section covers how to configure the Side Bar which contains Tool Panels. |
| `tool-panel-columns` | Columns Tool Panel | The Columns Tool Panel provides controls for managing the grid's columns. It can be used to show / hide / reorder columns, group rows and aggregate data and per |
| `tool-panel-filters` | Filters Tool Panel | The   allows accessing the grid's filters without needing to open up the column menu. |
| `tool-panel-filters-new` | New Filters Tool Panel | The new   allows accessing the grid's filters without needing to open up the column menu. |
| `aggregation` | Aggregation | Apply custom or provided functions to values to calculate group values in the grid. |
| `aggregation-columns` | Aggregation - Configure Columns | Columns can be configured to aggregate data for each level of row grouping or tree data. |
| `aggregation-custom-functions` | Aggregation - Custom Functions | This section covers how custom aggregation functions can be supplied and used in the grid. |
| `aggregation-filtering` | Aggregation - Filtering | Filtering can be configured to impact aggregate values in the grid. |
| `aggregation-show-values-as` | Aggregation - Show Values As | Show each value as a relative figure, such as a percentage of the grand total or of its parent group. |
| `aggregation-total-rows` | Aggregation - Total Rows | This section shows how to include group and grand total rows in the grid. |
| `formula-custom-functions` | Custom Functions | Custom formula functions let you extend the engine with domain-specific logic and reusable calculations. |
| `formula-editor-component` | Formula Editor Component | The Formula Cell Editor is the default editor for columns with  allowFormula: true . It tokenises cell references, highlights ranges, and provides function auto |
| `formula-reference` | Formula Reference | This page lists all supported operators and built-in functions for quick reference. For syntax usage and examples, see the main   page. |
| `formulas` | Formulas | Formulas let users enter spreadsheet-style expressions into grid cells so values update automatically when referenced data changes. |
| `clipboard` | Clipboard | You can copy and paste items to and from the grid using the system clipboard. |
| `excel-export-api` | Excel Export API Reference | This page documents the Excel Export API and Interfaces. |
| `excel-export-columns` | Excel Export - Columns | Excel Export allows you to select which columns get exported to Excel. |
| `excel-export-customising-content` | Excel Export - Customising Content | By default, the values exported to Excel will be formatted via the   feature. |
| `excel-export-data-protection` | Excel Export - Data Protection | Excel Export allows you to protect the exported worksheet so that users can only edit specific cells. |
| `excel-export-data-types` | Excel Export - Data Types | Excel Exporter allows you to export values into different Excel data types. |
| `excel-export-extra-content` | Excel Export - Extra Content | The recommended way to prepend and append content, is by passing an array of ExcelCell objects to  prependContent  or  appendContent . This ensures that the ext |
| `excel-export-formulas` | Excel Export - Formulas | Excel Export allows you to include Excel Formulas in the exported file. You can use formulas to translate any column Value Getters logic, so the column values a |
| `excel-export-freeze` | Excel Export - Freezing Content | Excel Export allows you to freeze parts of the exported content. |
| `excel-export-hyperlinks` | Excel Export - Hyperlinks | This section describes how to insert hyperlinks in the cells of the exported Excel file. |
| `excel-export-images` | Excel Export - Images | Excel Export allows including images in the Excel export file. For example, you can add your company logo to the top or bottom of the exported Excel spreadsheet |
| `excel-export-master-detail` | Excel Export - Master Detail | Excel Export provides ways to export Master/Detail grids to Excel. |
| `excel-export-multiple-sheets` | Excel Export - Multiple Sheets | Excel Export provides a way to export an Excel file with multiple sheets. This can be useful when you need to export data from different grids into a single Exc |
| `excel-export-notes` | Excel Export - Notes | Excel notes/comments can be added to exported cells using a callback, exported automatically from the   feature, or attached to custom content rows. |
| `excel-export-page-setup` | Excel Export - Page Setup | Excel Export allows you to configure the page settings for the exported Excel file. |
| `excel-export-rows` | Excel Export - Rows | Excel Export allows you to select which rows get exported to Excel. |
| `excel-export-styles` | Excel Export - Styles | Excel Export provides a special mechanism to add styles to the exported spreadsheet that works independently of the styles applied to the grid. |
| `excel-export-tables` | Excel Export - Excel Tables | Excel Export provides a way to export grid data as an Excel table, which would instantly enable the user to filter, sort, and analyse the data in Excel. You can |
| `master-detail` | Master / Detail | Master Detail refers to a top level grid called a Master Grid having rows that expand. When the row is expanded, another grid is displayed with more details rel |
| `master-detail-custom-detail` | Custom Detail | When a Master Row is expanded, the grid uses the default Detail Cell Renderer to create and display the Detail Grid inside one row of the Master Grid. You can p |
| `master-detail-grids` | Master / Detail - Detail Grids | When a row in the Master Grid is expanded, a new Detail Grid appears underneath that row. This page describes configuration options relevant to the Detail Grid. |
| `master-detail-height` | Master / Detail - Detail Height | This section shows how the detail height can be customised to suit application requirements. |
| `master-detail-master-rows` | Master / Detail - Master Rows | Master Rows are the rows inside the Master Grid that can be expanded to display Detail Grids. |
| `master-detail-nesting` | Master / Detail - Nesting | It is possible to nest Master / Detail grids. There is no special configuration required to do this, you just configure another Detail Grid to also act as a Mas |
| `master-detail-other` | Master / Detail - Other | Here we discuss areas of Master / Detail that don't quite fit within the other sections of the documentation. |
| `master-detail-refresh` | Master / Detail - Detail Refresh | It is desirable for the Detail Grid to refresh when fresh data is available for it. The grid will attempt to refresh the data in the Detail Grid when the parent |
| `pivoting` | Pivoting | Pivoting breaks down data in an additional dimension. |
| `pivoting-column-groups` | Pivot Column Groups | The grid generates pivot column groups representing each unique pivoted value. |
| `pivoting-result-columns` | Pivot Result Columns | The grid generates pivot result columns to display the aggregated values for each unique permutation of pivot values. |
| `pivoting-totals` | Pivot Totals | Pivot totals can be inserted into the grid to display the total aggregations of rows. |
| `grouping` | Row Grouping | Enable row grouping in the Angular Data Grid to allow rows to be grouped by columns. Define row groups, use the Grid API, or use the UI to group rows. |
| `grouping-data` | Row Grouping - Grouping Data | Enable row grouping in the Angular Data Grid to allow rows to be grouped by columns. Define row groups, use the Grid API, or use the UI to group rows. |
| `grouping-edit` | Row Grouping - Editing Groups | The grid supports editing grouped data when using the  . This page covers making group row cells editable, distributing edited values to descendant rows, and re |
| `grouping-group-panel` | Row Grouping - Row Group Panel | Use the Row Group Panel to enable users to modify the configured row group columns. |
| `grouping-opening-groups` | Row Grouping - Expanding Groups | Configure the initial expanded group row state when using Tree Data. |
| `grouping-row-dragging` | Row Grouping - Row Dragging | Combine row grouping with managed or unmanaged row dragging to move records between groups or reorder entire group branches. |
| `grouping-row-selection` | Row Grouping - Hierarchy Selection | Row Selection can be configured with groups to select all of a rows descendants. |
| `grouping-sorting` | Row Grouping - Sorting | This section provides details on how to configure and customise how row groups are sorted. |
| `grouping-group-rows` | Row Grouping - Group Rows | Full width group rows can be used to represent the group structure in the grid. |
| `grouping-multiple-group-columns` | Row Grouping - Multiple Group Columns | Display the group structure with one group column representing each level of row grouping. |
| `grouping-single-group-column` | Row Grouping - Single Column | Display the group structure with a single generated column in the grid. |
| `viewport` | Viewport Row Model | A Viewport is a row model that allows showing a 'window' of data in your client. Typically all the data will reside on the server and the server will know what  |
| `server-side-model-api-reference` | SSRM API Reference | The section lists the available Server-Side Row Model (SSRM) options. |
| `server-side-model-changing-columns` | SSRM Changing Columns | Columns can be added and removed from the Server-Side Row Model without resetting the row model. |
| `server-side-model-configuration` | SSRM Configuration | This section covers the Server-Side Cache and configurations available in the Server-Side Row Model. |
| `server-side-model-datasource` | SSRM Datasource | This section describes the Server-Side Datasource and demonstrates how it is used to load data from a server. |
| `server-side-model-filtering` | SSRM Filtering | This section covers Filtering using the Server-Side Row Model (SSRM). |
| `server-side-model-grouping` | SSRM Row Grouping | This section covers Row Grouping in the Server-Side Row Model (SSRM). |
| `server-side-model-master-detail` | SSRM Master Detail | This section shows how the Server-Side Row Model can be configured with a Master / Detail view. |
| `server-side-model-pagination` | SSRM Pagination | If you are dealing with large amounts of data, your applications may decide to use pagination to help the user navigate through the data. |
| `server-side-model-pivoting` | SSRM Pivoting | In this section we add Server-Side Pivoting to create an example with the ability to 'Slice and Dice' data using the Server-Side Row Model (SSRM). |
| `server-side-model-retry` | Load Retry | When a datasource load fails, call  retryServerSideLoads()  to reload the failed rows at a later time. |
| `server-side-model-row-height` | SSRM Row Height | Learn how to set Row Height when using the Server-Side Row Model. |
| `server-side-model-selection` | SSRM Row Selection | Selecting rows and groups in the Server-Side Row Model is supported. Configure the  selection  grid option as described in  . Some SSRM-specific considerations  |
| `server-side-model-sorting` | SSRM Sorting | This section covers Server-Side Sorting using the Server-Side Row Model. |
| `server-side-model-tree-data` | SSRM Tree Data | This section shows how Tree Data can be used with the Server-Side Row Model. |
| `server-side-operations-graphql` | Server-Side Operations With GraphQL | Learn how to perform server-side operations using GraphQL with a complete reference implementation that uses the MySQL database. |
| `server-side-operations-nodejs` | Server-Side Operations With Node.js | Learn how to perform server-side operations using Node.js with a complete reference implementation that uses the MySQL database. |
| `server-side-operations-oracle` | Server-Side Operations With Java & Oracle | Learn how to perform server-side operations using the Oracle Database with a complete reference implementation. |
| `server-side-operations-spark` | Server-Side Operations With Java & Spark | Learn how to perform server-side operations using Apache Spark with a complete reference implementation. |
| `server-side-model-updating-refresh` | SSRM Refresh | This section demonstrates refreshing rows in order to reflect changes at the source while using the Server-Side Row Model (SSRM). |
| `server-side-model-updating-single-row` | SSRM - Single Row Updates | This section demonstrates updating rows directly while using the Server-Side Row Model (SSRM). |
| `server-side-model-updating-transactions` | SSRM Transactions | This section shows how rows can be added, removed and updated using the Server-Side Transaction API. |
| `tree-data` | Tree Data - Overview | Tree Data provides a way to supply the grid with structured hierarchical data. |
| `tree-data-filtering` | Tree Data - Filtering | Filtering can be applied to Tree Data to reduce the range of displayed data. |
| `tree-data-group-column` | Tree Data - Group Column | Customise the generated group column when using Tree Data. |
| `tree-data-opening-groups` | Tree Data - Expanding Groups | Configure the initial expanded group row state when using Tree Data. |
| `tree-data-row-dragging` | Tree Data - Row Dragging | Rows can be rearranged interactively when using Tree Data by dragging with the mouse. |
| `tree-data-selection` | Tree Data - Tree Selection | Row Selection can allow users to select rows in a tree structure. |
| `tree-data-nesting` | Tree Data - Nested Records | Configure the grid to display structured data by providing nested records. |
| `tree-data-paths` | Tree Data - Data Paths | Configure the grid to display structured data by providing data paths. |
| `tree-data-self-referential` | Tree Data - Self-Referential Records | Configure the grid to display structured data by providing self-referential records where each record contains a reference to the id of its parent. This is the  |
| `integrated-charts` | Integrated Charts Overview | With   at its core, Integrated Charts provides built-in charting that seamlessly integrates with the grid, requiring minimal effort from developers. |
| `integrated-charts-api-downloading-image` | Chart Image Export | This section shows how to export charts via the Chart Toolbar and Grid API. |
| `integrated-charts-api-save-restore-charts` | Save / Restore Charts | This section shows how the Grid API can be used to save and restore charts. |
| `integrated-charts-chart-tool-panels` | Chart Tool Panels | The Chart Tool Panels allow users to change the selected chart type and customise the data and chart formatting. |
| `integrated-charts-chart-types` | Chart Types | This section provides an overview of the chart types available in Integrated Charts. |
| `integrated-charts-container` | Chart Container | This section shows how to specify an alternative chart container to the default grid-provided popup window. |
| `integrated-charts-customisation` | Chart Customisation | Integrated Charts can be customised via the  . |
| `integrated-charts-events` | Chart Events | There are several events which are raised at different points in the lifecycle of a chart. |
| `integrated-charts-installation` | Install Integrated Charts | This section shows how to install Integrated Charts. |
| `integrated-charts-menu` | Chart Menu | The Chart Menu appears in the top-right corner of the chart. The Chart Menu provides options to edit the chart, as well as actions such as unlinking the chart f |
| `integrated-charts-time-series` | Time Series | This section covers how to chart time series data using Integrated Charts. |
| `integrated-charts-api-cross-filter-chart` | Cross Filter Chart API | Cross-filtering charts allow users to interact with data in an easy and intuitive way. Clicking on chart elements automatically filters values in both the grid  |
| `integrated-charts-api-pivot-chart` | Pivot Chart API | This section shows how Pivot Charts can be created via the Grid API. |
| `integrated-charts-api-range-chart` | Range Chart API | This section shows how Range Charts can be created via the Grid API. |
| `integrated-charts-pivot-chart` | Pivot Chart | This section introduces charting with pivots and groups from inside the grid using Pivot Chart. |
| `integrated-charts-range-chart` | Range Chart | This section covers how charts can be created directly from a range of selected cells. |
| `sparklines-axis-types` | Sparklines - Axis Types | This section compares the different axis types that are available to all sparklines. |
| `sparklines-data` | Sparklines - Sparkline Data | This section starts off by comparing the different supported data formats before discussing how data can be formatted using a   for sparklines and then shows ho |
| `sparklines-installation` | Install Sparklines | This section shows how to install Sparklines. |
| `sparklines-points-of-interest` | Sparklines - Points of Interest | This section covers customisation of Sparkline Points of Interest. |
| `sparklines-tooltips` | Sparklines - Tooltips | Tooltips containing data related to specific points will appear when the sparkline is hovered. Sparkline tooltips are customisable as discussed below. |
| `sparklines-area-customisation` | Sparklines - Area Customisation | This section shows how Area Sparklines can be customised by overriding the default area options. |
| `sparklines-bar-customisation` | Sparklines - Bar Customisation | This section shows how Bar Sparklines can be customised by overriding the default bar options. |
| `sparklines-column-customisation` | Sparklines - Column Customisation | This section shows how Column Sparklines can be customised by overriding the default column options. |
| `sparklines-line-customisation` | Sparklines - Line Customisation | This section shows how Line Sparklines can be customised by overriding the default line options. |
| `sparklines-api-sparkline-area` | Area Sparkline Options | Angular Data Grid area sparkline options: full API reference for configuring in-cell area charts. |
| `sparklines-api-sparkline-bar` | Bar / Column Sparkline Options | Angular Data Grid bar and column sparkline options: full API reference for configuring in-cell bar and column charts. |
| `sparklines-api-sparkline-line` | Line Sparkline Options | Angular Data Grid line sparkline options: full API reference for configuring in-cell line charts. |
| `find` | Find | Find allows for values to be searched within the grid, with all matches highlighted and navigable, similar to find (  +  ) within the browser. |
| `notes` | Notes | Notes let users attach comments to individual cells without storing note text in row data. Cells with notes are marked in the grid, note actions are available f |
| `calculated-columns` | Calculated Columns | Calculated Columns let your end users add read-only values to the grid without storing those values in row data. |
| `cell-editing-batch` | Batch Editing | Batch editing lets you queue edits across multiple cells or rows, then commit or discard them all at once. |
| `provided-cell-editors-rich-select-async` | Rich Select Cell Editor - Async Values | The Rich Select Cell Editor supports loading values asynchronously, including paged loading and server-side filtering. |
| `provided-cell-editors-rich-select-customisation` | Rich Select Cell Editor - Customisation | The Rich Select Cell Editor supports cell renderers, value formatting, search and typing behaviour, multi-selection, and complex object values. |
| `filter-advanced` | Advanced Filter | The Advanced Filter allows for complex filter conditions to be entered across columns in a single type-ahead input, as well as within a hierarchical visual buil |
| `filter-multi` | Multi Filter | The Multi Filter allows multiple   or   to be used on the same column. This provides greater flexibility when filtering data in the grid. |
| `filter-set-api` | Set Filter - API | This section describes how the Set Filter can be controlled programmatically using API calls. |
| `filter-set-data-updates` | Set Filter - Data Updates | This section describes how changing data through   and the application   impacts the Set Filter's values. This is only applicable when the Set Filter is taking  |
| `filter-set-excel-mode` | Set Filter - Excel Mode | The Set Filter is a more powerful version of Excel's AutoFilter, allowing users to easily build more complex sets for filtering in less time. However, sometimes |
| `filter-set-filter-list` | Set Filter - Filter List | This section describes how Filter List values can be managed through custom sorting and formatting. Supplying filter values directly to the Set Filter is also d |
| `filter-set-mini-filter` | Set Filter - Mini Filter | This section describes the behaviour of the Mini Filter and shows how it can be configured. |
| `filter-set-tree-list` | Set Filter - Tree List | This section describes the behaviour of the Set Filter Tree List and shows how it can be configured. |
| `row-numbers` | Row Numbers | The Row Numbers Feature adds a Column that is always present at the start of the grid where each cell of this column will work as a row header. The following ex |
| `cell-selection-api-reference` | Cell Selection API Reference | As an example to illustrate the  cellSelectionChanged  event, if selecting a range of 5 cells in a row, the user will click the first cell and drag to the last  |
| `cell-selection-fill-handle` | Fill Handle | When working with cell selection, a Fill Handle allows you to run operations on cells as you adjust the size of the range. |
| `cell-selection-handle` | Range Handle | When working with cell selection, it can be useful to have a handle inside the last cell to enable the size of the current range to be adjusted. |
| `license-install` | Installing Your Licence Key | Validate your licence key and configure your application. See sample code and example projects to learn how to install your AG Grid Enterprise products. |
| `theming-master-detail` | Theming: Master / Detail Styling | This section shows how the detail grid can be styled. |
| `cell-selection` | Cell Selection | Cell selection allows Excel-like selection of ranges of cells. Cell selections are useful for visually highlighting data, copying data to the  , or for doing ag |
| `excel-export` | Excel Export | The grid provides in-built Excel (xlsx) export functionality without the need for any third party libraries. Exporting to Excel can be performed from the   or p |
| `filter-set` | Set Filter - Overview | Set Filter works like Excel, providing checkboxes to select values from a set. |
| `grouping-display-types` | Row Grouping - Displaying Grouped Data | Grouping hierarchy can be displayed in the grid in different ways. |
| `integrated-charts-application-created` | Application Created Charts | This section introduces Integrated Charts that are created programmatically within an application. |
| `integrated-charts-user-created` | User Created Charts | User created charts are designed to provide an out-of-the box charting experience, similar to that found in spreadsheet applications such as Excel, but fully in |
| `provided-cell-editors-rich-select` | Rich Select Cell Editor | An alternative to using the browser's  select  popup for dropdowns inside the grid. The Rich Select Cell Editor allows users to enter a cell value from a list o |
| `server-side-model` | Server-Side Row Model | This section gives an overview of the Server-Side Row Model (SSRM) and provides guidance on when it should be used. |
| `server-side-model-updating` | SSRM Updating Data | There are various different approaches for having the grid update to changes while using the Server-Side Row Model. |
| `sparklines-api-sparkline-options` | Sparklines - API | All sparkline types and interfaces are available from the  ag-charts-community  or  ag-charts-enterprise  packages. |
| `sparklines-overview` | Sparklines Overview | This section introduces the grid's built-in Sparklines - mini charts that are optimised for grid cells that can be used to provide insights into data trends at  |
| `tool-panel` | Tool Panels | This section covers Tool Panels, available via the grid's Side Bar, which allow for easy access to powerful grid operations such as grouping, pivoting, and filt |
| `tree-data-data` | Tree Data - Supplying Data | Tree Data can be supplied to the grid in multiple ways. |

### Disagreements between page flags and nav flags (3 of 275)

| Page | Page flag | Nav flag | Note |
| --- | --- | --- | --- |
| `license-install` | Enterprise | Community | Licence-key installation concerns the (Enterprise) licence; page flag kept. |
| `theming-master-detail` | Enterprise | Community | Styling for Master/Detail, an Enterprise feature; page flag kept. |
| `component-loading-cell-renderer` | Community | Enterprise | The loading cell component sits under the (Enterprise) SSRM nav group; page flag kept. |

15 nav items have no fetched page (14 external links + `react-hooks`).

---

## 9. Community feature inventory (141 pages)

Flagged `isEnterprise: false` (absent) on their own page. Grouped by docs nav section.


**AI Features**

- `mcp-server` — AG Grid Model Context Protocol (MCP) Server
- `skills` — AG Grid AI Skills

**Advanced Features > Accessories > Overlays**

- `overlays-active` — Active Overlay
- `overlays-provided` — Provided Overlays

**Advanced Features > Import & Export**

- `csv-export` — CSV Export
- `drag-and-drop` — Drag & Drop
- `excel-import` — Excel Import
- `printing` — Printing

**Advanced Features > Performance**

- `angular-ngzone` — AG Grid and NgZone
- `change-detection` — Change Detection
- `dom-virtualisation` — DOM Virtualisation
- `massive-row-count` — Massive Row Count
- `row-animation` — Row Animation
- `scrolling-performance` — Scrolling Performance
- `value-cache` — Value Cache

**Advanced Features > Server-Side Data**

- `infinite-scrolling` — Infinite Row Model
- `row-models` — Row Models

**Advanced Features > Server-Side Data > Server-Side Row Model**

- `component-loading-cell-renderer` — Loading Component

**Advanced Features > State & Lifecycle**

- `context` — Context
- `grid-lifecycle` — Grid Lifecycle
- `grid-state` — Grid State

**Core Features > Cells**

- `cell-expressions` — Expressions
- `cell-styles` — Cell Styles
- `cell-text-selection` — Cell Text Selection
- `change-cell-renderers` — Highlighting Changes
- `reference-data` — Reference Data
- `tooltips` — Tooltips
- `view-refresh` — View Refresh

**Core Features > Cells > Cell Content**

- `cell-data-types` — Cell Data Types
- `component-cell-renderer` — Cell Components
- `value-formatters` — Text Formatting
- `value-getters` — Getting Values

**Core Features > Columns**

- `column-groups` — Column Groups
- `column-moving` — Column Moving
- `column-pinning` — Column Pinning
- `column-sizing` — Column Sizing
- `column-spanning` — Column Spanning

**Core Features > Columns > Column Headers**

- `column-headers-components` — Column Headers - Custom Components
- `column-headers-styling` — Column Headers - Styling & Height

**Core Features > Columns > Configuration**

- `auto-generate-columns` — Auto-Generate Columns
- `column-definitions` — Column Definitions
- `column-state` — Column State
- `column-updating-definitions` — Updating Column Definitions

**Core Features > Editing**

- `cell-editing` — Cell Editing
- `cell-editing-full-row` — Full Row Editing
- `cell-editing-start-stop` — Start/Stop Cell Editing
- `cell-editing-validation` — Cell Editing Validation
- `cell-editors` — Edit Components
- `undo-redo-edits` — Undo / Redo Edits
- `value-parsers` — Parsing Values
- `value-setters` — Saving Values

**Core Features > Editing > Provided Cell Editors**

- `provided-cell-editors-checkbox` — Checkbox Cell Editor
- `provided-cell-editors-date` — Date Cell Editors
- `provided-cell-editors-large-text` — Large Text Cell Editor
- `provided-cell-editors-number` — Number Cell Editor
- `provided-cell-editors-select` — Select Cell Editor
- `provided-cell-editors-text` — Text Cell Editor

**Core Features > Filtering**

- `component-filter` — Filter Component
- `component-floating-filter` — Floating Filter Component
- `filter-external` — External Filter
- `filter-quick` — Quick Filter
- `filtering-overview` — Filtering Overview
- `floating-filters` — Floating Filters

**Core Features > Filtering > Column Filters**

- `filter-api` — Filter API
- `filter-applying` — Applying Filters
- `filter-bigint` — BigInt Filter
- `filter-conditions` — Filter Conditions
- `filter-date` — Date Filter
- `filter-number` — Number Filter
- `filter-text` — Text Filter

**Core Features > Interactivity**

- `accessibility` — Accessibility
- `aligned-grids` — Aligned Grids
- `keyboard-navigation` — Keyboard Interaction
- `localisation` — Localisation
- `rtl` — RTL - Right To Left
- `touch` — Touch

**Core Features > Rows**

- `accessing-data` — Accessing Rows
- `full-width-rows` — Full Width Rows
- `row-height` — Row Height
- `row-ids` — Row Data
- `row-pagination` — Row Pagination
- `row-pinning` — Row Pinning
- `row-sorting` — Row Sorting
- `row-spanning` — Row Spanning
- `row-styles` — Row Styles

**Core Features > Rows > Row Dragging**

- `row-dragging-customisation` — Row Dragging Customisation
- `row-dragging-managed` — Managed Row Dragging
- `row-dragging-to-external-dropzone` — Row Dragging to an External DropZone
- `row-dragging-to-grid` — Row Dragging Between Grids
- `row-dragging-unmanaged` — Unmanaged Row Dragging

**Core Features > Selection > Row Selection**

- `row-selection-api-reference` — Row Selection API Reference
- `row-selection-multi-row` — Multi-Row Selection
- `row-selection-single-row` — Single Row Selection

**Core Features > Updating Data**

- `data-update-high-frequency` — Client-Side Data - High Frequency Updates
- `data-update-row-data` — Updating Row Data
- `data-update-single-row-cell` — Client-Side Data - Single Row / Cell Updates
- `data-update-transactions` — Client-Side Data - Transaction Updates

**Getting Started**

- `community-vs-enterprise` — Community vs. Enterprise
- `getting-started` — Quick Start
- `key-features` — Key Features

**Getting Started > Compatibility & Security**

- `compatibility` — Version Compatibility
- `security` — Security
- `supported-browsers` — Supported Browsers

**Getting Started > Setup**

- `codemods` — Codemods
- `dev-validation` — Development Validation
- `installation` — Installation
- `migration` — Migration
- `modules` — AG Grid Modules

**Getting Started > Tutorials**

- `deep-dive` — Creating a Basic Grid
- `styling-tutorial` — Customising AG Grid Styles
- `testing` — Testing AG Grid

**Getting Started > Tutorials > Testing**

- `testing-async` — Testing Async

**Layout & Styling**

- `ag-grid-design-system` — AG Grid Design System
- `grid-size` — Grid Layout

**Layout & Styling > Theming**

- `custom-icons` — Custom Icons
- `themes` — Built-in themes
- `theming` — Theming
- `theming-borders` — Theming API: Customising Borders
- `theming-colors` — Theming: Colours & Dark Mode
- `theming-compactness` — Theming: Compactness & Row Height
- `theming-css` — Theming: Customising the grid with CSS
- `theming-distribution` — Theming: Distributing Shared Themes & Parts
- `theming-fonts` — Theming: Customising Fonts
- `theming-headers` — Theming: Customising Headers
- `theming-migration` — Migrating to the Theming API
- `theming-parameters` — Theme Parameters
- `theming-parts` — Theme Parts
- `theming-popups` — Theming: Customising Menus & Popups
- `theming-selections` — Theming: Customising Selections
- `theming-theme-builder` — Theme Builder Import and Export
- `theming-tool-panels` — Theming: Customising Tool Panels
- `theming-v32` — Legacy Themes
- `theming-widgets` — Customising Inputs & Widgets

**(overview)**

- `cell-content` — Cell Content
- `column-headers` — Column Headers
- `configuration` — Configuration
- `filtering` — Column Filters
- `overlays-overview` — Overlays
- `provided-cell-editors` — Provided Cell Editors
- `row-dragging` — Row Dragging
- `row-selection` — Row Selection

### Previously-Enterprise features now Community (v36.1.0)

These were commonly assumed to be Enterprise in older planning material, but the
site's own v36.1.0 flags classify them as **Community**:

- **Cell editing** (`cell-editing`, full-row, start/stop, validation, all provided
  editors) — the *Batch Editing* sub-page is the Enterprise one.
- **Row dragging / drag & drop** (general, managed, unmanaged, to external
  dropzone, between grids) — the *group* row-dragging and *tree* row-dragging
  pages are the Enterprise ones.
- **Column spanning** and **row spanning**.
- **Printing**.
- **Excel import** (CSV export/import are also Community).
- **Undo / Redo edits** (`UndoRedoEditModule`).
- **Value cache** (`ValueCacheModule`).
- **Infinite Row Model** (`InfiniteRowModelModule`).
- **Aligned grids** (`AlignedGridsModule`).
- **Reference data**.
- **Touch** support.
- **MCP Server** and **AI Skills** (AI Features section) — only the **AI Toolkit**
  is Enterprise.
- **Cell expressions** (Expressions) — the **Formulas** feature is the Enterprise
  one.

---

## 10. Sources

- https://www.ag-grid.com/angular-data-grid/getting-started/ · fetched 2026-08-18
- https://www.ag-grid.com/angular-data-grid/community-vs-enterprise/ · fetched 2026-08-18
- https://www.ag-grid.com/angular-data-grid/modules/ · fetched 2026-08-18
- https://www.ag-grid.com/angular-data-grid/row-models/ · fetched 2026-08-18
- https://www.ag-grid.com/angular-data-grid/key-features/ · fetched 2026-08-18
- https://www.ag-grid.com/license-pricing/ · fetched 2026-08-18
- 290 feature pages under https://www.ag-grid.com/angular-data-grid…/ · fetched 2026-08-18 (all HTTP 200)

**Caveats.** (a) The site is versioned; all findings are for docs version 36.1.0 as
rendered on 2026-08-18 — a later AG Grid release may reclassify features.
(b) The module list in §7 is limited to modules referenced by the API metadata of
fetched pages. (c) Nothing was read from `ag-grid-enterprise` itself (guardrail
G2); all enterprise classification comes from the public site.
