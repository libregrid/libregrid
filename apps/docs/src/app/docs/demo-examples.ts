export interface DemoVariant {
  framework: string;
  directory: string;
  initialFile: string;
  files: readonly string[];
}
export interface DemoExample {
  id: string;
  title: string;
  route: string;
  variants: readonly DemoVariant[];
}
/** Public demo inventory. The internal benchmark is deliberately excluded. */
export const DEMO_EXAMPLES: readonly DemoExample[] = [
  {
    id: 'selection-grid',
    title: 'Selection',
    route: 'selection',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'selection-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'selection-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'ssrm-selection-grid',
    title: 'Server Side Selection',
    route: 'server-side-selection',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'ssrm-selection-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'ssrm-selection-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'row-numbers-grid',
    title: 'Row Numbers',
    route: 'row-numbers',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'row-numbers-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'row-numbers-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'formulas-grid',
    title: 'Formulas',
    route: 'formulas',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'formulas-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'formulas-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'phase-eleven-grid',
    title: 'Advanced filter and Find',
    route: 'advanced-filter-find',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'phase-eleven-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'phase-eleven-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'phase-eleven-rich-select',
    title: 'Rich Select editor',
    route: 'advanced-filter-find',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'phase-eleven-rich-select/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'phase-eleven-rich-select/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'notes-grid',
    title: 'Notes',
    route: 'notes',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'notes-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'notes-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'pivot-grid',
    title: 'Pivot',
    route: 'pivot',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'pivot-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'pivot-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'batch-edit-grid',
    title: 'Batch Edit',
    route: 'batch-edit',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'batch-edit-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'batch-edit-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'ai-toolkit-grid',
    title: 'Ai Toolkit',
    route: 'ai-toolkit',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'ai-toolkit-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'data.ts', 'mock-transport.ts', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'ai-toolkit-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
          'data.ts',
          'mock-transport.ts',
        ],
      },
    ],
  },
  {
    id: 'tree-data-grid',
    title: 'Tree Data',
    route: 'tree-data',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'tree-data-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'tree-data-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'column-header-edit-grid',
    title: 'Column Header Edit',
    route: 'column-header-edit',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'column-header-edit-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'column-header-edit-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'sparklines-grid',
    title: 'Sparklines',
    route: 'sparklines',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'sparklines-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'sparklines-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'master-detail-grid',
    title: 'Master Detail',
    route: 'master-detail',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'master-detail-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'master-detail-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'demo-grid',
    title: 'Grid',
    route: 'grid',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'demo-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'demo-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'viewport-grid',
    title: 'Viewport',
    route: 'viewport',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'viewport-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'viewport-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'row-grouping-grid',
    title: 'Row Grouping',
    route: 'row-grouping',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'row-grouping-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'row-grouping-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'phase-twelve-grid',
    title: 'Charts',
    route: 'charts',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'phase-twelve-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'phase-twelve-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'columns-grid',
    title: 'Columns',
    route: 'columns',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'columns-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'columns-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'calculated-columns-grid',
    title: 'Calculated Columns',
    route: 'calculated-columns',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'calculated-columns-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'calculated-columns-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'angular-grid',
    title: 'Angular',
    route: 'angular',
    variants: [
      {
        framework: 'Angular',
        directory: 'angular-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'excel-grid',
    title: 'Excel export',
    route: 'excel-export',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'excel-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'excel-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'scores-grid',
    title: 'Scores sheet',
    route: 'excel-export',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'scores-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'scores-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'server-side-advanced-grid',
    title: 'Server Side Advanced',
    route: 'server-side-advanced',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'server-side-advanced-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'server-side-advanced-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'toolbar-grid',
    title: 'Toolbar',
    route: 'toolbar',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'toolbar-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'toolbar-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'menus-grid',
    title: 'Menus',
    route: 'menus',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'menus-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'menus-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'server-side-grid',
    title: 'Server Side',
    route: 'server-side',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'server-side-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'server-side-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'group-edit-allocation-grid',
    title: 'Allocation rules',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-allocation-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-allocation-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-policy-grid',
    title: 'Editing policy',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-policy-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-policy-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-equipment-grid',
    title: 'Equipment allocation',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-equipment-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-equipment-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-capacity-grid',
    title: 'Capacity and whole packs',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-capacity-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-capacity-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-nested-grid',
    title: 'Nested groups',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-nested-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-nested-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-pivot-grid',
    title: 'Pivot allocation',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-pivot-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-pivot-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'group-edit-tree-grid',
    title: 'Tree allocation',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-tree-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-tree-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'group-edit-move-grid',
    title: 'Regroup after editing',
    route: 'group-editing',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'group-edit-move-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'data.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'group-edit-move-grid/angular',
        initialFile: 'app.component.ts',
        files: [
          'app.component.ts',
          'data.ts',
          'app.component.html',
          'main.ts',
          'styles.css',
          'index.html',
        ],
      },
    ],
  },
  {
    id: 'filters-grid',
    title: 'Filters',
    route: 'filters',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'filters-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'filters-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
  {
    id: 'side-bar-grid',
    title: 'Side Bar',
    route: 'side-bar',
    variants: [
      {
        framework: 'TypeScript',
        directory: 'side-bar-grid/typescript',
        initialFile: 'main.ts',
        files: ['main.ts', 'index.html', 'styles.css'],
      },
      {
        framework: 'Angular',
        directory: 'side-bar-grid/angular',
        initialFile: 'app.component.ts',
        files: ['app.component.ts', 'app.component.html', 'main.ts', 'styles.css', 'index.html'],
      },
    ],
  },
];
