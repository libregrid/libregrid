import {
  BeanStub,
  type AgColumn,
  type CellCtrl,
  type GetNoteParams,
  type GridApi,
  type INoteAccess,
  type INotesFeature,
  type INotesService,
  type MenuItemDef,
  type NamedBean,
  type Note,
  type NoteParams,
  type RefreshNotesParams,
  type RowCtrl,
  type SetNoteParams,
} from 'ag-grid-community';
import type { MenuActionParams, MenuItemContribution } from '@libregrid/menu';
import { withViewportPopupParent } from '@libregrid/menu';
import { colIdOf, isColumnInstance, isLiveColumn } from './colKey';
import { NotesFeature } from './noteFeature';
import {
  attachNotePopupResize,
  buildNotePopup,
  isEditableText,
  syncNotePopupContent,
  type NotePopupDom,
} from './notePopup';
import type { NotesDataService } from './notesDataService';

/** The `menuItemMapper` bean (a reserved untyped bean name) as this service sees it. */
interface MenuItemMapperLike {
  registry?: {
    register(contribution: MenuItemContribution): void;
  };
}

/** The active note popup and everything needed to commit or rebuild it. */
interface ActivePopup {
  hideFunc: (params?: { forceHide?: boolean }) => void;
  dom: NotePopupDom;
  feature: NotesFeature;
  /** The params (with any embedded full-width `pinned` section) the popup edits. */
  params: GetNoteParams;
  /** Whether the text area is editable when the popup opened. */
  editable: boolean;
  detachResize: () => void;
  cleanupListeners: () => void;
}

/**
 * The `notesSvc` bean: the full INotesService surface Community's runtime
 * calls into (per-cell / full-width note features, note access, showing and
 * saving notes), plus the `note` context-menu contribution.
 *
 * Behaviour follows the public AG Grid docs (36.1 "Notes"):
 * - `notesDataSource` enables Notes and may be set/replaced at runtime.
 * - Noted cells are marked; hovering a noted cell opens the built-in
 *   resizable note editor after `noteShowDelay`; `noteTrigger: 'click'`
 *   opens existing notes on left click instead.
 * - `Shift + F2` (cell and full width row) and Shift+Click open the note of
 *   the focused/pressed cell, creating a new one when allowed — Community's
 *   keyboard/mouse handlers call `getNoteAccess` + `showNote` on this bean.
 * - Read-only notes and suppressed cells view but do not edit or remove.
 * - The context menu `note` token expands to Add Note / Edit Note + Remove
 *   Note / View Note + disabled Remove Note depending on state.
 *
 * @feature Notes
 */
export class NotesService extends BeanStub implements INotesService, NamedBean {
  public readonly beanName = 'notesSvc' as const;

  /** Live per-target features, keyed by row id + column id (or full-width marker). */
  private features = new Map<string, NotesFeature>();
  private popup: ActivePopup | undefined;
  private registeredNoteItem = false;

  public postConstruct(): void {
    // Community never calls `onDataSourceChanged` itself; the managed option
    // change flows through this listener (enable / disable / replace at
    // runtime).
    this.addManagedPropertyListener('notesDataSource', () => this.onDataSourceChanged());
    this.registerNoteMenuItem();
  }

  public override destroy(): void {
    this.closeActivePopup(false);
    for (const feature of this.features.values()) {
      feature.destroy();
    }
    this.features.clear();
    this.activeFeature0 = undefined;
    super.destroy();
  }

  // -------------------------------------------------------------------
  // INotesService
  // -------------------------------------------------------------------

  public hasDataSource(): boolean {
    return this.dataService()?.hasDataSource() ?? false;
  }

  public onDataSourceChanged(): void {
    // Re-evaluate every rendered target (markers appear or disappear) and
    // drop the popup when Notes was disabled.
    for (const feature of this.features.values()) {
      feature.refresh();
    }
    if (!this.hasDataSource() && this.popup) {
      this.closeActivePopup(false);
    }
  }

  /**
   * Community's CellCtrl calls this when the cell component is attached
   * (`eGui` is already set). A feature is created even before a data source
   * is configured so that setting `notesDataSource` at runtime can mark
   * already-rendered cells without a redraw.
   */
  public createNotesFeature(ctrl: CellCtrl): INotesFeature | undefined {
    const eGui = ctrl.eGui;
    if (!eGui) {
      return undefined;
    }
    const rowNode = ctrl.rowNode;
    const column = ctrl.column;
    const key = keyForParams({ rowNode, column });
    const existing = this.features.get(key);
    if (existing) {
      return existing;
    }
    const feature = new NotesFeature(this, {
      key,
      rowId: rowNode.id,
      element: eGui,
      params: { rowNode, column },
      isCell: true,
      isHoverSuppressed: () => ctrl.isNoteHoverSuppressed(),
    });
    this.features.set(key, feature);
    feature.refresh();
    return feature;
  }

  /**
   * Community's FullWidthRowFeature calls this for every rendered full width
   * row. As with cells the feature is created regardless of the data source
   * state (the data service guards full-width params on
   * `supportsFullWidthRows`), so runtime enablement marks rendered rows.
   */
  public createFullWidthNotesFeature(ctrl: RowCtrl): INotesFeature | undefined {
    const rowElement = ctrl.getCurrentRowElement();
    if (!rowElement) {
      return undefined;
    }
    const element = rowElement.querySelector<HTMLElement>('.ag-full-width-row') ?? rowElement;
    const rowNode = ctrl.rowNode;
    const key = keyForParams({ rowNode, location: 'fullWidthRow' });
    const existing = this.features.get(key);
    if (existing) {
      return existing;
    }
    const feature = new NotesFeature(this, {
      key,
      rowId: rowNode.id,
      element,
      params: { rowNode, location: 'fullWidthRow' },
      isCell: false,
      isHoverSuppressed: () => false,
      findPinned: (event: Event) => {
        // Embedded full width rows render left/centre/right sections.
        const info = ctrl.findInfoForEvent(event);
        return info && (info.pinned === 'left' || info.pinned === 'right') ? info.pinned : null;
      },
    });
    this.features.set(key, feature);
    feature.refresh();
    return feature;
  }

  public getNote(params: GetNoteParams): Note | undefined {
    return this.dataService()?.getNote(params);
  }

  public setNote(params: SetNoteParams): void {
    if (!this.hasDataSource()) {
      return;
    }
    this.dataService()?.setNote(params);
    // Re-evaluate the rendered target (marker, or open popup content).
    this.features.get(keyForParams(params))?.refresh();
  }

  public refreshNotes(params?: RefreshNotesParams): void {
    const rowIds = params?.rowNodes
      ? new Set(params.rowNodes.map((node) => String(node.id)))
      : undefined;
    const colIds = params?.columns
      ? new Set(params.columns.map((c) => colIdOf(c)))
      : undefined;
    for (const feature of this.features.values()) {
      if (rowIds && !rowIds.has(String(feature.target.rowId))) {
        continue;
      }
      if (colIds) {
        const colId = colIdForParams(feature.target.params);
        if (colId == null || !colIds.has(colId)) {
          continue;
        }
      }
      feature.refresh();
    }
  }

  public showNote(params: GetNoteParams, focusEditor = false): boolean {
    if (!this.hasDataSource()) {
      return false;
    }
    const feature = this.features.get(keyForParams(params));
    if (!feature) {
      return false; // target not currently rendered
    }
    const pinned = pinnedOf(params);
    feature.show(pinned == null ? { focusEditor } : { focusEditor, pinned });
    return true;
  }

  public getNoteAccess(params: GetNoteParams): NoteAccess | undefined {
    if (!this.hasDataSource()) {
      return undefined;
    }
    const note = this.getNote(params);
    const isFullWidth = 'location' in params && params.location === 'fullWidthRow';
    const column = isFullWidth ? undefined : this.resolveColumn(params.column);
    const isSuppressed = isFullWidth
      ? false
      : this.isSuppressed(column, params);
    const isReadOnly = note?.readOnly === true;
    return {
      params,
      rowNode: params.rowNode,
      column: column as AgColumn,
      note,
      isReadOnly,
      isSuppressed,
      canView: note != null,
      canCreate: note == null && !isSuppressed,
      canEdit: note != null && !isReadOnly && !isSuppressed,
      canDelete: note != null && !isReadOnly && !isSuppressed,
    };
  }

  // -------------------------------------------------------------------
  // Feature registry + popup plumbing (used by NotesFeature)
  // -------------------------------------------------------------------

  public activeFeature(): NotesFeature | undefined {
    return this.activeFeature0;
  }

  public isPopupOpenFor(feature: NotesFeature): boolean {
    return this.popup != null && this.activeFeature0 === feature;
  }

  public closePopupFor(feature: NotesFeature, save: boolean): void {
    if (this.activeFeature0 === feature) {
      this.closeActivePopup(save);
    }
  }

  public unregisterFeature(feature: NotesFeature): void {
    if (this.features.get(feature.target.key) === feature) {
      this.features.delete(feature.target.key);
    }
    if (this.activeFeature0 === feature) {
      this.activeFeature0 = undefined;
    }
  }

  public noteTrigger(): 'hover' | 'click' {
    return this.gos.get('noteTrigger') === 'click' ? 'click' : 'hover';
  }

  public noteShowDelay(): number {
    const value = this.gos.get('noteShowDelay');
    return typeof value === 'number' && value >= 0 ? value : 180;
  }

  public noteHideDelay(): number {
    const value = this.gos.get('noteHideDelay');
    return typeof value === 'number' && value >= 0 ? value : 220;
  }

  /** Open (or re-focus) the popup for this feature. */
  public showForFeature(feature: NotesFeature, focusEditor: boolean, pinned?: 'left' | 'right'): void {
    if (!this.hasDataSource()) {
      return;
    }
    const params = withPinned(feature.target.params, pinned);
    const access = this.getNoteAccess(params);
    if (!access) {
      return;
    }
    const canOpen = (access.note != null && access.canView) || (access.note == null && access.canCreate);
    if (!canOpen) {
      return;
    }
    if (this.activeFeature0 === feature) {
      // Already open: just re-focus the editor when asked.
      if (focusEditor && isEditableText(this.popup!.dom.textEl)) {
        this.popup!.dom.textEl.focus();
      }
      return;
    }
    this.closeActivePopup(true);
    this.openPopup(feature, params, access, focusEditor);
  }

  /**
   * Re-evaluate the open popup for this feature after a refresh: close it
   * when the note went away, rebuild it when editability changed, otherwise
   * sync title/meta/text in place.
   */
  public refreshActivePopupFor(feature: NotesFeature): void {
    if (this.activeFeature0 !== feature || !this.popup) {
      return;
    }
    const access = this.getNoteAccess(this.popup.params);
    if (!access) {
      this.closeActivePopup(true);
      return;
    }
    const editable = (access.note != null && access.canEdit) || (access.note == null && access.canCreate);
    if (editable !== this.popup.editable) {
      const pinned = pinnedOf(this.popup.params);
      this.closeActivePopup(false);
      this.showForFeature(feature, false, pinned);
      return;
    }
    syncNotePopupContent(this.popup.dom, access.note);
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  private activeFeature0: NotesFeature | undefined;

  private dataService(): NotesDataService | undefined {
    return this.beans.notesDataSvc as NotesDataService | undefined;
  }

  private resolveColumn(colKey: NoteParams['column']): AgColumn | undefined {
    return isColumnInstance(colKey) ? colKey : this.beans.colModel.getCol(colKey);
  }

  /**
   * `colDef.suppressNoteActions`: a boolean, or a callback evaluated for the
   * cell. Full width rows have no column and are never suppressed.
   */
  private isSuppressed(column: AgColumn | undefined, params: GetNoteParams): boolean {
    if (!isLiveColumn(column)) {
      return false;
    }
    const { suppressNoteActions } = column.getColDef();
    if (typeof suppressNoteActions === 'function') {
      const rowNode = params.rowNode;
      return suppressNoteActions({
        node: rowNode,
        column,
        data: rowNode.data,
        colDef: column.getColDef(),
        api: this.beans.gridApi,
        context: this.gos.get('context'),
      }) === true;
    }
    return suppressNoteActions === true;
  }

  private registerNoteMenuItem(): void {
    const mapper = this.beans.menuItemMapper as MenuItemMapperLike | undefined;
    if (!mapper?.registry || this.registeredNoteItem) {
      return;
    }
    // Same name + order as the `@libregrid/menu` stub: registration wins.
    mapper.registry.register({
      name: 'note',
      order: 40,
      factory: (params: MenuActionParams) => this.buildNoteMenuItems(params),
    });
    this.registeredNoteItem = true;
  }

  /**
   * The `note` context-menu token, expanded by state (public docs):
   * - no note, creation allowed  → Add Note
   * - editable note              → Edit Note + Remove Note
   * - read-only note             → View Note + disabled Remove Note
   * - suppressed                 → disabled actions; an existing note still
   *   shows View Note
   */
  private buildNoteMenuItems(params: MenuActionParams): MenuItemDef[] | null {
    const { node, column } = params;
    if (node == null || !isLiveColumn(column)) {
      return null;
    }
    if (!this.hasDataSource()) {
      return null;
    }
    const access = this.getNoteAccess({ rowNode: node, column });
    if (!access) {
      return null;
    }
    const open = (focus: boolean) => (): void => {
      this.showNote(access.params, focus);
    };
    if (access.note == null) {
      return access.canCreate ? [{ name: 'Add Note', action: open(true) }] : null;
    }
    if (access.isSuppressed) {
      return [{ name: 'View Note', action: open(true) }];
    }
    if (access.isReadOnly) {
      return [
        { name: 'View Note', action: open(true) },
        { name: 'Remove Note', disabled: true },
      ];
    }
    return [
      { name: 'Edit Note', action: open(true) },
      {
        name: 'Remove Note',
        action: (): void => {
          this.setNote({ rowNode: node, column, note: undefined });
        },
      },
    ];
  }

  private openPopup(
    feature: NotesFeature,
    params: GetNoteParams,
    access: NoteAccess,
    focusEditor: boolean,
  ): void {
    const editable =
      (access.note != null && access.canEdit) || (access.note == null && access.canCreate);
    const dom = buildNotePopup({
      note: access.note,
      canWriteText: editable,
      canDelete: access.canDelete === true,
    });
    const popupSvc = this.beans.popupSvc;
    if (!popupSvc) {
      return;
    }
    const eTarget = feature.target.element;

    let active: ActivePopup | undefined;
    withViewportPopupParent(this.beans.gridApi as GridApi | undefined, () => {
      const added = popupSvc.addPopup({
        eChild: dom.root,
        ariaLabel: 'Note',
        closeOnEsc: true,
        afterGuiAttached: () => {
          this.positionPopup(dom.root, eTarget);
        },
        closedCallback: () => {
          // The popup service closes the popup (outside click etc.); clean up
          // our state. The service always commits on close, so this is a
          // no-op when we already closed it ourselves.
          this.teardownPopupState();
        },
      });
      const detachResize = attachNotePopupResize(dom.root, dom.resizeHandle);
      const cleanupListeners = this.wirePopupListeners(dom, () => this.closeActivePopup(true), () => {
        this.setNote({ ...params, note: undefined });
        this.closeActivePopup(false);
      });
      active = {
        hideFunc: added.hideFunc,
        dom,
        feature,
        params,
        editable,
        detachResize,
        cleanupListeners,
      };
    });

    if (!active) {
      return;
    }
    this.activeFeature0 = feature;
    this.popup = active;
    if (focusEditor && isEditableText(dom.textEl)) {
      dom.textEl.focus();
      dom.textEl.select();
    }
  }

  /**
   * Position the popup below (or above, when it does not fit) the target
   * element, clamped to the viewport. A synthetic mouse event at the target's
   * top-left lets us reuse the popup service's event positioning.
   */
  private positionPopup(ePopup: HTMLElement, eTarget: HTMLElement): void {
    const rect = eTarget.getBoundingClientRect();
    const popupSvc = this.beans.popupSvc;
    if (!popupSvc) {
      return;
    }
    const mouseEvent = new MouseEvent('mouseover', {
      clientX: rect.left + Math.min(80, rect.width / 2),
      clientY: rect.bottom,
    });
    popupSvc.positionPopupUnderMouseEvent({
      type: 'note',
      mouseEvent,
      ePopup,
      skipObserver: true,
    });
  }

  private wirePopupListeners(
    dom: NotePopupDom,
    close: () => void,
    remove: () => void,
  ): () => void {
    const onCloseClick = (): void => close();
    const onRemoveClick = (): void => remove();
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    // Moving onto the popup cancels the hide scheduled by the cell's mouseout.
    const onMouseOver = (): void => {
      const feature = this.activeFeature0;
      if (feature) {
        feature.cancelHide();
      }
    };
    dom.closeBtn.addEventListener('click', onCloseClick);
    dom.removeBtn?.addEventListener('click', onRemoveClick);
    dom.root.addEventListener('keydown', onKeydown);
    dom.root.addEventListener('mouseover', onMouseOver);
    return () => {
      dom.closeBtn.removeEventListener('click', onCloseClick);
      dom.removeBtn?.removeEventListener('click', onRemoveClick);
      dom.root.removeEventListener('keydown', onKeydown);
      dom.root.removeEventListener('mouseover', onMouseOver);
    };
  }

  /**
   * Close the active popup, committing unsaved text when `save` (and the
   * note is writable). Removing the note is committed by the caller via
   * `setNote` before closing.
   */
  public closeActivePopup(save: boolean): void {
    const active = this.popup;
    if (!active) {
      return;
    }
    if (save) {
      this.commitIfDirty(active);
    }
    this.teardownPopupState();
    active.hideFunc();
  }

  private teardownPopupState(): void {
    const active = this.popup;
    if (!active) {
      return;
    }
    this.popup = undefined;
    if (this.activeFeature0 === active.feature) {
      this.activeFeature0 = undefined;
    }
    active.cleanupListeners();
    active.detachResize();
  }

  private commitIfDirty(active: ActivePopup): void {
    const { textEl } = active.dom;
    if (!isEditableText(textEl)) {
      return; // read-only popup: nothing to commit
    }
    const text = textEl.value;
    const access = this.getNoteAccess(active.params);
    if (!access) {
      return;
    }
    if (access.note != null) {
      if (text === access.note.text || !access.canEdit) {
        return;
      }
      // The built-in editor updates the text only; metadata is preserved.
      this.dataService()?.setNote({
        ...active.params,
        note: { ...access.note, text },
      });
    } else {
      if (text.trim() === '' || !access.canCreate) {
        return; // an empty new note is discarded
      }
      this.dataService()?.setNote({ ...active.params, note: { text } });
    }
    active.feature.refresh();
  }
}

/** The INoteAccess object this service builds (Community marks it @internal). */
type NoteAccess = INoteAccess;

/** Registry key for a note target: row id + column id, or the full-width marker. */
export function keyForParams(params: GetNoteParams): string {
  if ('location' in params && params.location === 'fullWidthRow') {
    return `${params.rowNode.id}::__fullWidth__`;
  }
  return `${params.rowNode.id}::${colIdOf(params.column)}`;
}

function colIdForParams(params: GetNoteParams): string | undefined {
  if ('location' in params && params.location === 'fullWidthRow') {
    return undefined;
  }
  return colIdOf(params.column);
}

function pinnedOf(params: GetNoteParams): 'left' | 'right' | undefined {
  if ('location' in params && params.location === 'fullWidthRow') {
    return params.pinned;
  }
  return undefined;
}

function withPinned(params: GetNoteParams, pinned: 'left' | 'right' | undefined): GetNoteParams {
  if (pinned == null || ('location' in params && params.location !== 'fullWidthRow')) {
    return params;
  }
  return { rowNode: params.rowNode, location: 'fullWidthRow', pinned };
}
