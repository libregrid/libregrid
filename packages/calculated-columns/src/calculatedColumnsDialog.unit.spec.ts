/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { FormulaError } from './expression';
import { CalculatedColumnDialog, type CalcDialogHost, type CalcDialogProps, type ColumnReference } from './calculatedColumnsDialog';

const REFERENCES: ColumnReference[] = [
  { colId: 'revenue', label: 'Revenue' },
  { colId: 'cost', label: 'Cost' },
];

const OPTIONS = {
  dataTypes: ['text', 'number', 'date', 'boolean'],
  expressionPickers: ['columns', 'functions', 'operators'] as Array<'columns' | 'functions' | 'operators'>,
  applyMode: 'live' as const,
};

interface FakeHost {
  applied: CalcDialogProps[];
  validated: CalcDialogProps[];
  revertCalls: number;
  closeCalls: number;
  error: FormulaError | null;
}

function makeHost(colId = 'calc-1'): { host: CalcDialogHost; fake: FakeHost } {
  const fake: FakeHost = {
    applied: [],
    validated: [],
    revertCalls: 0,
    closeCalls: 0,
    error: null,
  };
  const host: CalcDialogHost = {
    colId,
    validate: (props) => {
      fake.validated.push(props);
      return fake.error;
    },
    apply: (props) => {
      fake.applied.push(props);
      return fake.error;
    },
    revert: () => {
      fake.revertCalls++;
    },
    close: () => {
      fake.closeCalls++;
    },
  };
  return { host, fake };
}

function openDialog(
  host: CalcDialogHost,
  options: typeof OPTIONS = OPTIONS,
  initial: CalcDialogProps = { headerName: 'Profit', cellDataType: 'number', expression: '[revenue] - [cost]' },
): { root: HTMLDivElement; dialog: CalculatedColumnDialog } {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dialog = new CalculatedColumnDialog(host, options, REFERENCES, initial);
  dialog.open(root, false);
  return { root, dialog };
}

function titleInput(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-title-input');
  if (!el) throw new Error('title input not found');
  return el;
}

function typeInput(): HTMLSelectElement {
  const el = document.querySelector<HTMLSelectElement>('.lgr-calc-dialog-type');
  if (!el) throw new Error('type select not found');
  return el;
}

function expressionInput(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression');
  if (!el) throw new Error('expression input not found');
  return el;
}

function pickerButtons(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-picker'));
}

function pickerItems(): HTMLElement[] {
  // Only items in the currently-visible picker list.
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-picker-item')).filter(
    (el) => el.closest<HTMLElement>('.lgr-calc-dialog-picker-list')?.hidden === false,
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('CalculatedColumnDialog (unit)', () => {
  it('renders the dialog with the initial props', () => {
    const { host } = makeHost();
    openDialog(host);
    expect(document.querySelector('.lgr-calc-dialog')).not.toBeNull();
    expect(titleInput().value).toBe('Profit');
    expect(typeInput().value).toBe('number');
    expect(expressionInput().value).toBe('[revenue] - [cost]');
    expect(typeInput().options.length).toBe(4);
  });

  it('applies title/type changes immediately in live mode', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    titleInput().value = 'Net Profit';
    titleInput().dispatchEvent(new Event('input', { bubbles: true }));
    expect(fake.applied.at(-1)?.headerName).toBe('Net Profit');

    typeInput().value = 'text';
    typeInput().dispatchEvent(new Event('change', { bubbles: true }));
    expect(fake.applied.at(-1)?.cellDataType).toBe('text');
    expect(fake.validated).toHaveLength(0); // live mode validates via apply
  });

  it('applies expression edits in live mode and surfaces errors', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    expressionInput().value = '[nope] + 1';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    expect(fake.applied.at(-1)?.expression).toBe('[nope] + 1');

    fake.error = { code: '#REF!', message: 'unknown column' } as FormulaError;
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    const errorEl = document.querySelector('.lgr-calc-dialog-error') as HTMLElement;
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).toContain('#REF!');
  });

  it('closes via the close button and notifies the host', () => {
    const { host, fake } = makeHost();
    const { dialog } = openDialog(host);
    document.querySelector<HTMLElement>('.lgr-calc-dialog-close')!.click();
    expect(fake.closeCalls).toBe(1);
    expect(document.querySelector('.lgr-calc-dialog')).toBeNull();
    dialog.destroy();
  });

  it('closes on Escape without applying', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    expressionInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fake.closeCalls).toBe(1);
    expect(fake.applied).toHaveLength(0);
  });

  it('closes on an outside mousedown', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(fake.closeCalls).toBe(1);
  });

  it('offers column, function and operator pickers and inserts at the cursor', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    const [columns, functions, operators] = pickerButtons();
    expect(columns!.textContent).toContain('Columns');
    expect(functions!.textContent).toContain('Functions');
    expect(operators!.textContent).toContain('Operators');

    columns!.click();
    const columnItems = pickerItems();
    expect(columnItems.length).toBe(2);
    columnItems[1]!.click(); // insert [cost]
    expect(expressionInput().value).toBe('[revenue] - [cost][cost]');
    expect(fake.applied.at(-1)?.expression).toBe('[revenue] - [cost][cost]');

    functions!.click();
    const functionItems = pickerItems();
    expect(functionItems.some((el) => el.textContent?.includes('SUM()'))).toBe(true);
    functionItems.find((el) => el.textContent?.includes('SUM()'))!.click();
    expect(expressionInput().value).toContain('SUM(');

    operators!.click();
    const operatorItems = pickerItems();
    expect(operatorItems.some((el) => el.querySelector('code')?.textContent === '+')).toBe(true);
  });

  it('autocompletes column references while typing a bracket', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    const input = expressionInput();
    input.value = '[rev';
    input.setSelectionRange(4, 4);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggest = document.querySelector<HTMLElement>('.lgr-calc-dialog-suggest');
    expect(suggest?.hidden).toBe(false);
    const items = suggest!.querySelectorAll('.lgr-calc-dialog-suggest-item');
    expect(items.length).toBe(1); // only [revenue] matches '[rev'
    (items[0] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(input.value).toBe('[revenue]');
    expect(fake.applied.at(-1)?.expression).toBe('[revenue]');
  });

  it('autocompletes function names and navigates with arrow keys', () => {
    const { host } = makeHost();
    openDialog(host);
    const input = expressionInput();
    input.value = 'su';
    input.setSelectionRange(2, 2);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const suggest = document.querySelector<HTMLElement>('.lgr-calc-dialog-suggest');
    expect(suggest?.hidden).toBe(false);
    const items = suggest!.querySelectorAll<HTMLElement>('.lgr-calc-dialog-suggest-item');
    expect(items.length).toBeGreaterThan(0);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[1]?.classList.contains('lgr-calc-dialog-suggest-active')).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // The arrow moved to the second match (SUMIF).
    expect(input.value).toBe('SUMIF(');
  });

  it('skips the suggestion panel when nothing matches', () => {
    const { host } = makeHost();
    openDialog(host);
    const input = expressionInput();
    input.value = '[zzz';
    input.setSelectionRange(4, 4);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector<HTMLElement>('.lgr-calc-dialog-suggest')?.hidden).toBe(true);
  });

  it('deferred mode validates without applying and applies on Apply', () => {
    const { host, fake } = makeHost();
    openDialog(host, { ...OPTIONS, applyMode: 'deferred' });
    expressionInput().value = '[revenue] + 1';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    expect(fake.validated.at(-1)?.expression).toBe('[revenue] + 1');
    expect(fake.applied).toHaveLength(0);

    document.querySelector<HTMLElement>('.lgr-calc-dialog-apply')!.click();
    expect(fake.applied.at(-1)?.expression).toBe('[revenue] + 1');
    expect(fake.closeCalls).toBe(1);
  });

  it('deferred mode blocks Apply for invalid expressions', () => {
    const { host, fake } = makeHost();
    fake.error = { code: '#PARSE!', message: 'parse' } as FormulaError;
    openDialog(host, { ...OPTIONS, applyMode: 'deferred' });
    expressionInput().value = '[revenue +';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLElement>('.lgr-calc-dialog-apply')!.click();
    expect(fake.applied).toHaveLength(0);
    expect(fake.closeCalls).toBe(0);
    expect(document.querySelector<HTMLElement>('.lgr-calc-dialog-error')?.hidden).toBe(false);
  });

  it('deferred-mode Cancel closes without applying', () => {
    const { host, fake } = makeHost();
    openDialog(host, { ...OPTIONS, applyMode: 'deferred' });
    expressionInput().value = 'changed';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLElement>('.lgr-calc-dialog-cancel')!.click();
    expect(fake.applied).toHaveLength(0);
    expect(fake.closeCalls).toBe(1);
  });

  it('restores focus on destroy when a restore element was provided', () => {
    const { host } = makeHost();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const dialog = new CalculatedColumnDialog(host, OPTIONS, REFERENCES, {
      headerName: 'X',
      cellDataType: 'number',
      expression: '1',
    });
    dialog.open(root, false, trigger);
    dialog.destroy();
    expect(document.activeElement).toBe(trigger);
  });
});
