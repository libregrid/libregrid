/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { AgColumn, type ColDef } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { FormulaCellEditor, type FormulaCellEditorParams } from './formulaCellEditor';
import { FormulaService } from './formulaService';

const COL_IDS = ['a', 'b', 'calc'];
const ROW_IDS = ['r1', 'r2', 'r3'];

/** FormulaService with a real layout (columns a..calc, rows r1..r3) for conversions. */
function makeFormulaService(): FormulaService {
  const columns = new Map<string, AgColumn>(
    COL_IDS.map((id) => [id, new AgColumn({ field: id } as ColDef, null, id, true, 'user')]),
  );
  const rows = ROW_IDS.map((id) => ({ id }));
  return makeBeanHarness(FormulaService, {
    gridOptions: { rowModelType: 'clientSide' },
    beans: {
      colModel: { getNonPivotColById: (colId: string) => columns.get(colId), pivotMode: false },
      visibleCols: { allCols: [...columns.values()] },
      gridApi: {
        getDisplayedRowAtIndex: (i: number) => rows[i],
        getDisplayedRowCount: () => rows.length,
      },
    },
  }).bean;
}

function makeParams(overrides: Partial<FormulaCellEditorParams> = {}): FormulaCellEditorParams {
  return {
    colDef: {},
    column: {},
    api: {},
    ...overrides,
  } as unknown as FormulaCellEditorParams;
}

function makeEditor(params: Partial<FormulaCellEditorParams> = {}, formulaSvc: FormulaService = makeFormulaService()) {
  const editor = new FormulaCellEditor();
  editor.wireBeans({ formula: formulaSvc } as never);
  editor.init(makeParams({ value: params.value ?? '', ...params }));
  return editor;
}

function input(editor: FormulaCellEditor): HTMLInputElement {
  return editor.getGui().querySelector<HTMLInputElement>('.lgr-formula-input')!;
}

function typeText(editor: FormulaCellEditor, text: string, caret?: number): void {
  const el = input(editor);
  el.value = text;
  const pos = caret ?? text.length;
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FormulaCellEditor (unit)', () => {
  it('renders a tokenised overlay and a transparent input', () => {
    const editor = makeEditor({ value: '=B2 + SUM(A1:A3)' });
    expect(editor.getGui().className).toBe('lgr-formula-editor');
    const tokens = editor.getGui().querySelectorAll('.lgr-formula-tokens span');
    expect(tokens.length).toBeGreaterThan(0);
    expect(editor.getGui().querySelector('.lgr-formula-tok-ref')).not.toBeNull();
    expect(editor.getGui().querySelector('.lgr-formula-tok-fn')).not.toBeNull();
    expect(input(editor).value).toBe('=B2 + SUM(A1:A3)');
  });

  it('re-tokenises while typing', () => {
    const editor = makeEditor({ value: '' });
    typeText(editor, '=A1*2');
    expect(editor.getGui().querySelector('.lgr-formula-tok-ref')).not.toBeNull();
    expect(editor.getGui().querySelector('.lgr-formula-tok-num')).not.toBeNull();
  });

  it('shows shorthand for stored long-hand formulas', () => {
    const h = { bean: makeFormulaService(), destroy: () => undefined };
    const editor = makeEditor({ value: '=[b:r2] + 1' }, h.bean);
    expect(input(editor).value).toBe('=B2 + 1');
    h.destroy();
  });

  it('commits the long-hand storage form through getValue', () => {
    const h = { bean: makeFormulaService(), destroy: () => undefined };
    const editor = makeEditor({ value: '=B2 + 1' }, h.bean);
    expect(editor.getValue()).toBe('=[b:r2] + 1');
    h.destroy();
  });

  it('returns plain text unchanged when the edit is not a formula', () => {
    const editor = makeEditor({ value: 'x' });
    typeText(editor, 'hello');
    expect(editor.getValue()).toBe('hello');
  });

  it('flags invalid formulas only with validateFormulas', () => {
    const editor = makeEditor({ value: '=A1 +' });
    expect(editor.getGui().classList.contains('lgr-formula-invalid')).toBe(false);
    typeText(editor, '=A1 +');
    expect(editor.getGui().classList.contains('lgr-formula-invalid')).toBe(false); // validation not enabled

    const validating = makeEditor({ value: '=A1 +', validateFormulas: true });
    expect(validating.getGui().classList.contains('lgr-formula-invalid')).toBe(true);
    expect(validating.isCancelAfterEnd()).toBe(true);
    typeText(validating, '=A1 + 1');
    expect(validating.getGui().classList.contains('lgr-formula-invalid')).toBe(false);
    expect(validating.isCancelAfterEnd()).toBe(false);
  });

  it('offers function autocomplete while typing a name and accepts with Enter', () => {
    const editor = makeEditor({ value: '' });
    typeText(editor, '=SU');
    const suggestions = editor.getGui().querySelectorAll('.lgr-formula-suggestion');
    expect(suggestions.length).toBeGreaterThan(0);
    const first = suggestions[0]!.textContent!;
    expect(first.toUpperCase().startsWith('SU')).toBe(true);

    input(editor).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(input(editor).value).toBe(`=${first}()`);
    expect(editor.getGui().querySelector('.lgr-formula-suggestion')).toBeNull();
  });

  it('navigates suggestions with arrow keys and closes on Escape', () => {
    const editor = makeEditor({ value: '' });
    typeText(editor, '=C');
    expect(editor.getGui().querySelectorAll('.lgr-formula-suggestion').length).toBeGreaterThan(1);
    const active = () => editor.getGui().querySelector('.lgr-formula-suggestion-active')!.textContent;
    const first = active();
    input(editor).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(active()).not.toBe(first);
    input(editor).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(editor.getGui().querySelector('.lgr-formula-suggestion')).toBeNull();
  });

  it('shows no autocomplete for cell-shaped prefixes', () => {
    const editor = makeEditor({ value: '' });
    typeText(editor, '=B2');
    expect(editor.getGui().querySelector('.lgr-formula-suggestion')).toBeNull();
  });

  it('highlights referenced ranges through the Cell Selection API and restores on destroy', () => {
    const added: unknown[] = [];
    let cleared = 0;
    const api = {
      addCellRange: (params: unknown) => added.push(params),
      getCellRanges: () => [],
      clearRangeSelection: () => {
        cleared++;
      },
    };
    const h = { bean: makeFormulaService(), destroy: () => undefined };
    const editor = makeEditor({ value: '=SUM(A1:B2)' }, h.bean);
    // Re-init with the range-capable api.
    editor.destroy();
    const editor2 = new FormulaCellEditor();
    editor2.wireBeans({ formula: h.bean } as never);
    editor2.init(makeParams({ value: '=SUM(A1:B2)', api } as never));
    expect(added).toEqual([{ rowStartIndex: 0, rowEndIndex: 1, columnStart: 'a', columnEnd: 'b' }]);
    editor2.destroy();
    expect(cleared).toBe(1);
    h.destroy();
  });

  it('skips range highlighting without a Cell Selection API', () => {
    const h = { bean: makeFormulaService(), destroy: () => undefined };
    const editor = makeEditor({ value: '=SUM(A1:B2)' }, h.bean); // api stub has no addCellRange
    expect(editor.getGui().className).not.toContain('lgr-formula-invalid');
    h.destroy();
  });

  it('focuses the input on attach', () => {
    const editor = makeEditor({ value: '=A1' });
    document.body.append(editor.getGui());
    editor.afterGuiAttached();
    expect(document.activeElement).toBe(input(editor));
  });
});
