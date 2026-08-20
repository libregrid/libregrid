import {
  BeanStub,
  type AgColumn,
  type AgProvidedColumnGroup,
  type ColumnHeaderEditOptions,
  type GridApi,
  type IColumnHeaderEditService,
  type MenuItemDef,
  type NamedBean,
  isColumn,
  isProvidedColumnGroup,
} from 'ag-grid-community';
import type { MenuActionParams, MenuItemContribution } from '@libregrid/menu';

type HeaderEditTarget = AgColumn | AgProvidedColumnGroup;
type ApplyMode = 'live' | 'deferred';

/** The `menuItemMapper` bean (a reserved untyped bean name) as this service sees it. */
interface MenuItemMapperLike {
  registry?: {
    register(contribution: MenuItemContribution): void;
  };
}

interface ActiveEditor {
  target: HeaderEditTarget;
  eEditor: HTMLElement;
  eInput: HTMLInputElement;
  /** Header-name override in effect when the editor opened (restored on live-mode cancel). */
  originalOverride: string | null;
  applyMode: ApplyMode;
}

/**
 * Column header edit service — the `colHeaderEditSvc` bean.
 *
 * Replaces AG Grid Enterprise's `ColumnHeaderEditModule`: lets users rename
 * column and column-group header names from the UI ("Edit Column Name" in the
 * column menu) when the definition sets `headerNameEditable: true`.
 *
 * Behaviour (public AG Grid docs, 36.1 "Editable Column Header Names"):
 * - Edited names persist as part of column state (`headerNameOverride`) and
 *   column-group state (`colModel.groupHeaderNameOverrides`) and take
 *   priority over `headerValueGetter`.
 * - The `columnHeaderEdit` grid option configures the editor:
 *   `applyMode: 'live'` (default) applies every keystroke immediately;
 *   `'deferred'` shows Apply/Cancel buttons and applies on commit.
 *   `suppressColumnHighlighting` disables the edit highlight.
 *
 * The Community header comps already subscribe to the
 * `columnHeaderEditHighlightChanged` grid event and call
 * `isHighlightedColumn`/`isHighlightedGroup` (v36 has exactly those two
 * call sites for `colHeaderEditSvc`), so highlighting is pure state + one
 * event dispatch per open/close.
 *
 * @feature ColumnHeaderEdit
 */
export class ColumnHeaderEditService extends BeanStub implements IColumnHeaderEditService, NamedBean {
  public readonly beanName = 'colHeaderEditSvc' as const;

  private active: ActiveEditor | null = null;

  public postConstruct(): void {
    this.registerMenuItem();
  }

  public override destroy(): void {
    this.closeEditor(true);
    super.destroy();
  }

  // ------------------------------------------------------------------
  // IColumnHeaderEditService
  // ------------------------------------------------------------------

  /**
   * The "Edit Column Name" menu item for the target, or `null` when it is
   * not editable. Community v36 has no call site for this (Enterprise-only),
   * so the column-menu entry point comes from the `editColumnName` registry
   * contribution this service registers in `postConstruct`.
   */
  public getEditColumnNameMenuItem(target: HeaderEditTarget): MenuItemDef | null {
    if (!this.isEditable(target)) return null;
    return {
      name: 'Edit Column Name',
      action: () => this.showHeaderNameEditor(target),
    };
  }

  /**
   * Whether the column or group header name can be edited from the UI:
   * `headerNameEditable: true` on the definition, and (for columns) not a
   * calculated column — calculated columns get their names from the
   * expression, not the header.
   */
  public isEditable(target: HeaderEditTarget): boolean {
    if (isColumn(target)) {
      return target.getColDef().headerNameEditable === true && target.calculatedExpression == null;
    }
    if (isProvidedColumnGroup(target)) {
      return target.getColGroupDef()?.headerNameEditable === true;
    }
    return false;
  }

  /**
   * Open the header-name editor for the given column or column group.
   * If another editor is open it is closed first (committed in live mode,
   * restored in live-mode-cancel / discarded in deferred mode).
   */
  public showHeaderNameEditor(target: HeaderEditTarget): void {
    if (!this.isEditable(target)) return;
    if (this.active) this.closeEditor(true);

    const options = this.gos.get('columnHeaderEdit') as ColumnHeaderEditOptions | undefined;
    const applyMode: ApplyMode = options?.applyMode === 'deferred' ? 'deferred' : 'live';
    const originalOverride = this.readCurrentOverride(target);

    const eEditor = document.createElement('div');
    eEditor.classList.add('lgr-header-name-editor');
    eEditor.style.position = 'absolute';
    eEditor.style.zIndex = '2';
    eEditor.style.boxSizing = 'border-box';

    const eInput = document.createElement('input');
    eInput.type = 'text';
    eInput.classList.add('lgr-header-name-editor-input');
    eInput.value = this.currentDisplayName(target) ?? '';

    eEditor.appendChild(eInput);
    if (applyMode === 'deferred') {
      const eApply = document.createElement('button');
      eApply.type = 'button';
      eApply.classList.add('lgr-header-name-editor-apply');
      eApply.textContent = 'Apply';
      const eCancel = document.createElement('button');
      eCancel.type = 'button';
      eCancel.classList.add('lgr-header-name-editor-cancel');
      eCancel.textContent = 'Cancel';
      // Keep the input focused so the blur-commit below does not fire
      // before the button click is handled.
      eApply.addEventListener('mousedown', (e) => e.preventDefault());
      eCancel.addEventListener('mousedown', (e) => e.preventDefault());
      eApply.addEventListener('click', () => this.commitEditor());
      eCancel.addEventListener('click', () => this.closeEditor(false));
      eEditor.appendChild(eApply);
      eEditor.appendChild(eCancel);
    }

    eInput.addEventListener('input', () => {
      if (this.active?.applyMode === 'live') {
        this.applyName(target, eInput.value);
      }
    });
    eInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitEditor();
      } else if (e.key === 'Escape') {
        this.closeEditor(false);
      }
    });
    eInput.addEventListener('blur', () => this.commitEditor());

    this.positionEditor(eEditor, target);
    this.beans.eRootDiv.appendChild(eEditor);

    this.active = { target, eEditor, eInput, originalOverride, applyMode };
    eInput.focus();
    eInput.select();
    this.dispatchHighlight();
  }

  /** Whether this column's header is currently being edited (drives the Community header highlight). */
  public isHighlightedColumn(column: AgColumn): boolean {
    if (this.suppressColumnHighlighting()) return false;
    const active = this.active;
    return !!active && isColumn(active.target) && active.target === column;
  }

  /** Whether this group's header is currently being edited (drives the Community group-header highlight). */
  public isHighlightedGroup(columnGroup: AgProvidedColumnGroup): boolean {
    if (this.suppressColumnHighlighting()) return false;
    const active = this.active;
    return !!active && isProvidedColumnGroup(active.target) && active.target === columnGroup;
  }

  // ------------------------------------------------------------------
  // Editor lifecycle
  // ------------------------------------------------------------------

  /** Commit the current input (deferred mode applies it) and close the editor. */
  private commitEditor(): void {
    const active = this.active;
    if (!active) return;
    if (active.applyMode === 'deferred') {
      this.applyName(active.target, active.eInput.value);
    }
    this.closeEditor(true);
  }

  /**
   * Close the editor. `commit=false` cancels: deferred mode has not applied
   * anything yet (nothing to undo); live mode restores the override that was
   * in effect when the editor opened.
   */
  private closeEditor(commit: boolean): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    if (!commit && active.applyMode === 'live') {
      this.restoreOverride(active.target, active.originalOverride);
    }
    active.eEditor.remove();
    this.dispatchHighlight();
  }

  /** Apply the given name to the target header (empty string clears the override). */
  private applyName(target: HeaderEditTarget, rawName: string): void {
    const name = rawName.trim() === '' ? null : rawName.trim();
    if (isColumn(target)) {
      target.setHeaderNameOverride(name, 'uiColumnHeaderEdit');
      return;
    }
    if (isProvidedColumnGroup(target)) {
      const api = this.beans.gridApi as GridApi | undefined;
      if (!api) return;
      // `setColumnGroupState` accepts `headerName` per item at runtime (it is
      // applied to `colModel.groupHeaderNameOverrides` and dispatches
      // `columnHeaderNameChanged`); the public d.ts predates that field, hence
      // the cast.
      api.setColumnGroupState([
        {
          groupId: target.groupId,
          open: target.isExpanded(),
          headerName: name,
        } as { groupId: string; open: boolean },
      ]);
    }
  }

  /** Restore a previously captured override (live-mode cancel). */
  private restoreOverride(target: HeaderEditTarget, originalOverride: string | null): void {
    if (isColumn(target)) {
      if (target.headerNameOverride !== originalOverride) {
        target.setHeaderNameOverride(originalOverride, 'uiColumnHeaderEdit');
      }
      return;
    }
    if (isProvidedColumnGroup(target)) {
      this.applyName(target, originalOverride ?? '');
    }
  }

  // ------------------------------------------------------------------
  // State helpers
  // ------------------------------------------------------------------

  private suppressColumnHighlighting(): boolean {
    return (this.gos.get('columnHeaderEdit') as ColumnHeaderEditOptions | undefined)?.suppressColumnHighlighting === true;
  }

  /** The display name the header currently shows (editor initial value). */
  private currentDisplayName(target: HeaderEditTarget): string | null {
    const api = this.beans.gridApi as GridApi | undefined;
    if (!api) return null;
    if (isColumn(target)) {
      return api.getDisplayNameForColumn(target, 'header') || null;
    }
    if (isProvidedColumnGroup(target)) {
      const displayInstance = target.displayInstances?.[0];
      if (displayInstance) {
        return api.getDisplayNameForColumnGroup(displayInstance, 'header') || null;
      }
      return target.getColGroupDef()?.headerName ?? target.groupId;
    }
    return null;
  }

  /** The header-name override currently in effect (for live-mode cancel). */
  private readCurrentOverride(target: HeaderEditTarget): string | null {
    if (isColumn(target)) {
      return target.headerNameOverride;
    }
    if (isProvidedColumnGroup(target)) {
      const api = this.beans.gridApi as GridApi | undefined;
      if (!api) return null;
      // The runtime state includes `headerName` per group (see `_getColGroupState`);
      // the public d.ts does not, hence the cast.
      const item = api.getColumnGroupState().find((g) => g.groupId === target.groupId) as
        | { groupId: string; open: boolean; headerName?: string | null }
        | undefined;
      return item?.headerName ?? null;
    }
    return null;
  }

  /** Position the editor over the target's header cell. */
  private positionEditor(eEditor: HTMLElement, target: HeaderEditTarget): void {
    const anchor = this.findAnchorElement(target);
    if (!anchor) return; // jsdom / not-yet-rendered: leave at 0,0, fully covered by CSS
    const rootRect = this.beans.eRootDiv.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    eEditor.style.top = `${rect.top - rootRect.top}px`;
    eEditor.style.left = `${rect.left - rootRect.left}px`;
    eEditor.style.width = `${rect.width}px`;
    eEditor.style.height = `${rect.height}px`;
  }

  /** Find the rendered header cell for the target (`.ag-header-cell[col-id]` / `.ag-header-group-cell[col-id]`). */
  private findAnchorElement(target: HeaderEditTarget): HTMLElement | null {
    let wanted: string | null = null;
    if (isColumn(target)) {
      wanted = target.colIdSanitised;
    } else if (isProvidedColumnGroup(target)) {
      wanted = target.displayInstances?.[0]?.colIdSanitised ?? null;
    }
    if (wanted == null) return null;
    // Group headers render as `.ag-header-group-cell` (leaf columns as
    // `.ag-header-cell`); both carry the same `col-id` attribute.
    const cells = this.beans.eRootDiv.querySelectorAll<HTMLElement>('.ag-header-cell, .ag-header-group-cell');
    for (const cell of cells) {
      if (cell.getAttribute('col-id') === wanted) return cell;
    }
    return null;
  }

  /** Tell the Community header comps to re-evaluate the edit highlight. */
  private dispatchHighlight(): void {
    const active = this.active;
    const colId = active && isColumn(active.target) ? active.target.getColId() : null;
    const groupId = active && isProvidedColumnGroup(active.target) ? active.target.groupId : null;
    (this.beans as unknown as { eventSvc?: { dispatchEvent(event: object): void } }).eventSvc?.dispatchEvent({
      type: 'columnHeaderEditHighlightChanged',
      colId,
      groupId,
    });
  }

  // ------------------------------------------------------------------
  // Menu contribution
  // ------------------------------------------------------------------

  /**
   * Register the `editColumnName` column-menu item with the live
   * `MenuItemMapper` registry (overriding the `@libregrid/menu` stub, which
   * resolves to `null` when this module is not registered).
   *
   * The `MenuActionParams` factories in the registry have no bean access by
   * design, so — unlike the module-scope `registerMenuItems` pattern used by
   * API-only features — the service registers its own item at runtime with a
   * closure over `this`. All beans are constructed before any `postConstruct`
   * runs, so the mapper (when present) is always available here.
   */
  private registerMenuItem(): void {
    const mapper = this.beans.menuItemMapper as MenuItemMapperLike | undefined;
    if (!mapper?.registry) return;
    mapper.registry.register({
      name: 'editColumnName',
      order: 41,
      factory: (params: MenuActionParams): MenuItemDef | null => {
        const column = params.column;
        return column ? this.getEditColumnNameMenuItem(column as HeaderEditTarget) : null;
      },
    });
  }
}
