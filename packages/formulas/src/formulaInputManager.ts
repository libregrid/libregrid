import { BeanStub, type IFormulaInputManagerService, type NamedBean } from 'ag-grid-community';

interface ActiveEditor {
  onDeactivate: () => void;
}

/**
 * The `formulaInputManager` bean — coordinates formula-aware editors so only
 * one active formula input exists at a time (the cell editor registers itself
 * on open with its own id and unregisters on close; other formula surfaces
 * consult `isActiveEditor` before capturing input).
 *
 * @feature Formulas
 */
export class FormulaInputManager extends BeanStub implements IFormulaInputManagerService, NamedBean {
  public readonly beanName = 'formulaInputManager' as const;

  private activeEditors = new Map<number, ActiveEditor>();

  public registerActiveEditor(editorId: number, onDeactivate: () => void): boolean {
    if (this.activeEditors.has(editorId)) return false;
    this.activeEditors.set(editorId, { onDeactivate });
    return true;
  }

  public unregisterActiveEditor(editorId: number, onDeactivate: () => void): void {
    if (!this.activeEditors.has(editorId)) return;
    this.activeEditors.delete(editorId);
    onDeactivate();
  }

  public isActiveEditor(editorId: number): boolean {
    return this.activeEditors.has(editorId);
  }

  /** Drop every registration without running their callbacks (grid teardown). */
  public clear(): void {
    this.activeEditors.clear();
  }

  public override destroy(): void {
    this.clear();
    super.destroy();
  }
}
