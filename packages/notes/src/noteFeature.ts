import type { GetNoteParams, INotesFeature } from 'ag-grid-community';
import type { NotesService } from './notesService';

/** CSS class marking a rendered cell / full width row that has a note. */
export const NOTE_MARKER_CLASS = 'lgr-cell-has-note';

/**
 * What a note feature is attached to: a rendered cell, or a rendered full
 * width row. The service creates one per rendered target through
 * `createNotesFeature` / `createFullWidthNotesFeature` (the reserved
 * Community call sites).
 */
export interface NoteTarget {
  /** Registry key — row id plus column id (or the full-width marker). */
  key: string;
  /** Row id (the `getRowId` value), for `refreshNotes({ rowNodes })`. */
  rowId: string | number | undefined;
  /** The rendered element: the cell's eGui or the full width row element. */
  element: HTMLElement;
  /** The note params for this target (without a pinned section). */
  params: GetNoteParams;
  /** Whether the target is a cell (as opposed to a full width row). */
  isCell: boolean;
  /**
   * Community's CellCtrl hook: true while the cell is editing, has a formula
   * error or a cell validation error — notes must not open then. Full width
   * rows are never "editing", so they report false.
   */
  isHoverSuppressed(): boolean;
  /**
   * Full width rows with `embedFullWidthRows` render left/centre/right
   * sections; resolves the pinned section for an event on the row (undefined
   * for non-embedded rows and cells, where there is no section).
   */
  findPinned?(event: Event): 'left' | 'right' | null;
}

/**
 * Per-target note feature. Community owns its lifecycle: the CellCtrl /
 * FullWidthRowFeature create it, call `refresh()` on cell refresh, `show()`
 * for keyboard/mouse shortcuts, and destroy it via `context.destroyBean`
 * (which only calls `destroy()`).
 *
 * Hover and click opening is wired here, because Community has no
 * cell-render event for it: the feature listens on the target element and
 * schedules the popup through the shared NotesService (one active note
 * popup at a time, delayed by `noteShowDelay` / `noteHideDelay`).
 */
export class NotesFeature implements INotesFeature {
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private attached = false;
  private destroyed = false;

  constructor(
    private readonly service: NotesService,
    public readonly target: NoteTarget,
  ) {
    this.attach();
  }

  public refresh(): void {
    if (this.destroyed) {
      return;
    }
    const hasNote = this.service.getNote(this.target.params) != null;
    this.target.element.classList.toggle(NOTE_MARKER_CLASS, hasNote);
    // If this target's popup is open, keep its content in sync (or close it
    // when the note no longer exists / can no longer be viewed).
    this.service.refreshActivePopupFor(this);
  }

  public show(params?: { focusEditor?: boolean; pinned?: 'left' | 'right' }): void {
    if (this.destroyed) {
      return;
    }
    this.clearTimers();
    this.service.showForFeature(this, params?.focusEditor === true, params?.pinned);
  }

  public hide(save?: boolean): void {
    if (this.destroyed) {
      return;
    }
    this.clearTimers();
    if (this.service.activeFeature() === this) {
      this.service.closeActivePopup(save === true);
    }
  }

  /**
   * Cancel a pending hover-out hide. Called by the service when the pointer
   * moves from the cell onto the popup itself, so the editor stays open.
   */
  public cancelHide(): void {
    if (this.hideTimer !== undefined) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.clearTimers();
    this.detach();
    this.service.closePopupFor(this, /* save */ true);
    this.service.unregisterFeature(this);
  }

  private attach(): void {
    if (this.attached) {
      return;
    }
    const { element } = this.target;
    element.addEventListener('mouseover', this.onMouseOver);
    element.addEventListener('mouseout', this.onMouseOut);
    element.addEventListener('mousedown', this.onMouseDown);
    this.attached = true;
  }

  private detach(): void {
    if (!this.attached) {
      return;
    }
    const { element } = this.target;
    element.removeEventListener('mouseover', this.onMouseOver);
    element.removeEventListener('mouseout', this.onMouseOut);
    element.removeEventListener('mousedown', this.onMouseDown);
    this.attached = false;
  }

  /** Hover over a noted cell: schedule the popup after `noteShowDelay`. */
  private onMouseOver = (event: MouseEvent): void => {
    if (this.service.noteTrigger() !== 'hover') {
      return;
    }
    if (this.target.isHoverSuppressed()) {
      return;
    }
    if (this.service.getNote(this.paramsForEvent(event)) == null) {
      return;
    }
    this.clearTimers();
    this.showTimer = setTimeout(() => {
      this.showTimer = undefined;
      this.show();
    }, this.service.noteShowDelay());
  };

  /**
   * Pointer left the target: schedule the hide after `noteHideDelay`. The
   * timer is cancelled again if the pointer re-enters the target or moves
   * onto the popup itself (the service cancels it on popup mouseover).
   */
  private onMouseOut = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.target.element.contains(related)) {
      return;
    }
    if (!this.service.isPopupOpenFor(this)) {
      this.clearTimers();
      return;
    }
    this.clearTimers();
    this.hideTimer = setTimeout(() => {
      this.hideTimer = undefined;
      this.hide();
    }, this.service.noteHideDelay());
  };

  /** Click trigger: an existing note opens on left click (no delay). */
  private onMouseDown = (event: MouseEvent): void => {
    if (this.service.noteTrigger() !== 'click') {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (this.target.isHoverSuppressed()) {
      return;
    }
    if (this.service.getNote(this.paramsForEvent(event)) == null) {
      return;
    }
    this.clearTimers();
    this.show();
  };

  /**
   * Full width rows with `embedFullWidthRows` render left/centre/right
   * sections: the pinned section is resolved from the event target when the
   * row provides a resolver, otherwise the unpinned (centre) params are used.
   */
  private paramsForEvent(event: Event | null): GetNoteParams {
    if (this.target.isCell || event == null) {
      return this.target.params;
    }
    const params = this.target.params;
    if (params.location !== 'fullWidthRow') {
      return params;
    }
    const pinned = this.target.findPinned?.(event) ?? null;
    return pinned == null ? params : { rowNode: params.rowNode, location: 'fullWidthRow', pinned };
  }

  private clearTimers(): void {
    if (this.showTimer !== undefined) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
    if (this.hideTimer !== undefined) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }
}
