import {
  BeanStub,
  type ColKey,
  type Column,
  type FullWidthNotesDataSource,
  type GetNoteParams,
  type GridApi,
  type INotesDataService,
  type NamedBean,
  type Note,
  type NotesDataSource,
  type SetNoteParams,
} from 'ag-grid-community';
import { isColumnInstance } from './colKey';

/** The `notesDataSource` option as this service sees it. */
type AnyNotesDataSource = NotesDataSource | FullWidthNotesDataSource;

/**
 * The `notesDataSvc` bean: owns the `notesDataSource` grid option.
 *
 * The option is managed, so enabling, disabling or replacing the data source
 * at runtime flows through the managed-property listener: the outgoing
 * source gets `destroy()`, the incoming one gets `init({ api, context })`
 * (public AG Grid docs, 36.1 "Notes"). All note reads/writes are delegated
 * here, so `NotesService` never talks to the user's data source directly.
 *
 * @feature Notes
 */
export class NotesDataService extends BeanStub implements INotesDataService, NamedBean {
  public readonly beanName = 'notesDataSvc' as const;

  private dataSource: AnyNotesDataSource | undefined;

  public postConstruct(): void {
    // The managed-property listener fires only on changes, so the initial
    // value is read here and initialised once.
    const initial = this.gos.get('notesDataSource');
    this.dataSource = isDataSource(initial) ? initial : undefined;
    this.initSource(this.dataSource);
    this.addManagedPropertyListener('notesDataSource', (event) => {
      const next = isDataSource(event.currentValue) ? event.currentValue : undefined;
      if (next === this.dataSource) {
        return;
      }
      this.dataSource?.destroy?.();
      this.dataSource = next;
      this.initSource(this.dataSource);
    });
  }

  public override destroy(): void {
    this.dataSource?.destroy?.();
    this.dataSource = undefined;
    super.destroy();
  }

  public hasDataSource(): boolean {
    return this.dataSource != null;
  }

  public supportsFullWidthRows(): boolean {
    const ds = this.dataSource;
    return ds != null && 'supportsFullWidthRows' in ds && ds.supportsFullWidthRows === true;
  }

  public getNote(params: GetNoteParams): Note | undefined {
    const ds = this.dataSource;
    if (!ds) {
      return undefined;
    }
    if ('location' in params && params.location === 'fullWidthRow') {
      if (!this.supportsFullWidthRows()) {
        return undefined;
      }
      return (ds as FullWidthNotesDataSource).getNote({
        rowNode: params.rowNode,
        location: 'fullWidthRow',
        ...(params.pinned == null ? {} : { pinned: params.pinned }),
      });
    }
    return ds.getNote({
      rowNode: params.rowNode,
      column: this.toColumn(params.column),
    });
  }

  public setNote(params: SetNoteParams): void {
    const ds = this.dataSource;
    if (!ds) {
      return;
    }
    if ('location' in params && params.location === 'fullWidthRow') {
      if (!this.supportsFullWidthRows()) {
        return;
      }
      (ds as FullWidthNotesDataSource).setNote({
        rowNode: params.rowNode,
        location: 'fullWidthRow',
        ...(params.pinned == null ? {} : { pinned: params.pinned }),
        note: params.note,
      });
      return;
    }
    ds.setNote({
      rowNode: params.rowNode,
      column: this.toColumn(params.column),
      note: params.note,
    });
  }

  private initSource(source: AnyNotesDataSource | undefined): void {
    source?.init?.({
      api: this.beans.gridApi as GridApi,
      context: this.gos.get('context'),
    });
  }

  /**
   * Map the service-level `column` (a `ColKey`, which may be a string id)
   * onto the data source params, where it must be a `Column` object.
   */
  private toColumn(colKey: ColKey): Column {
    if (isColumnInstance(colKey)) {
      return colKey;
    }
    return this.beans.colModel.getCol(colKey) as Column;
  }
}

function isDataSource(value: unknown): value is AnyNotesDataSource {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as NotesDataSource).getNote === 'function' &&
    typeof (value as NotesDataSource).setNote === 'function'
  );
}
