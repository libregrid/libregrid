/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { evaluate, parseExpression, type FormulaError, validateExpression } from './expression';
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

function paletteTabs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-palette-tab'));
}

function paletteItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-palette-item'));
}

function expressionChips(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-expression-chip'));
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
    const dialog = document.querySelector<HTMLElement>('.lgr-calc-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(document.querySelector('.lgr-calc-dialog-expression-canvas')).not.toBeNull();
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

  it('closes when its backdrop is clicked', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    document.querySelector<HTMLElement>('.lgr-calc-dialog-overlay')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(fake.closeCalls).toBe(1);
  });

  it('switches palette tabs and inserts their exact existing formula syntax', () => {
    const { host, fake } = makeHost();
    openDialog(host);
    const [columns, functions, operators] = paletteTabs();
    expect(columns!.textContent).toContain('Columns');
    expect(functions!.textContent).toContain('Functions');
    expect(operators!.textContent).toContain('Operators');

    columns!.click();
    const columnItems = paletteItems();
    expect(columnItems.length).toBe(2);
    columnItems[1]!.click(); // insert [cost]
    expect(expressionInput().value).toBe('[revenue] - [cost][cost]');
    expect(fake.applied.at(-1)?.expression).toBe('[revenue] - [cost][cost]');

    functions!.click();
    const functionItems = paletteItems();
    expect(functionItems.some((el) => el.textContent?.includes('SUM()'))).toBe(true);
    functionItems.find((el) => el.textContent?.includes('SUM()'))!.click();
    expect(expressionInput().value).toContain('SUM()');
    expect(expressionInput().selectionStart).toBe(expressionInput().value.indexOf('SUM(') + 4);

    operators!.click();
    const operatorItems = paletteItems();
    expect(operatorItems.some((el) => el.querySelector('code')?.textContent === '+')).toBe(true);
    expect(document.querySelector('.lgr-calc-dialog-operator-group')?.textContent).toContain('Arithmetic');
  });

  it('opens inline value inputs on expression pills and commits them on blur', () => {
    const { host } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '' });
    paletteTabs().find((tab) => tab.textContent === 'Values')!.click();
    const value = (label: string) => paletteItems().find((item) => item.querySelector('code')?.textContent === label)!;

    value('Text').click();
    const text = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression-canvas [aria-label="Edit text value"]')!;
    text.value = 'North';
    text.dispatchEvent(new Event('blur'));
    expect(expressionInput().value).toBe('"North"');

    expressionInput().value = '';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    value('Number').click();
    const number = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression-canvas [aria-label="Edit number value"]')!;
    number.value = '42.5';
    number.dispatchEvent(new Event('blur'));
    expect(expressionInput().value).toBe('42.5');

    expressionInput().value = '';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    value('Date').click();
    const date = document.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression-canvas [aria-label="Edit date value"]')!;
    expect(date.type).toBe('date');
    date.value = '2026-08-20';
    date.dispatchEvent(new Event('blur'));
    expect(expressionInput().value).toBe('"2026-08-20"');
    expect(validateExpression(expressionInput().value)).toBeNull();

    expressionInput().value = '';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    value('Boolean').click();
    const bool = document.querySelector<HTMLSelectElement>('.lgr-calc-dialog-expression-canvas [aria-label="Edit boolean value"]')!;
    bool.value = 'FALSE';
    bool.dispatchEvent(new Event('blur'));
    expect(expressionInput().value).toBe('FALSE');
    expect(validateExpression(expressionInput().value)).toBeNull();

    document.querySelector<HTMLElement>('.lgr-calc-dialog-expression-chip-literal')!.click();
    expect(document.querySelector('.lgr-calc-dialog-expression-canvas [aria-label="Edit boolean value"]')).not.toBeNull();
  });

  it('uses a selected canvas gap as the palette insertion target', () => {
    const { host, fake } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '[revenue][cost]' });
    const gap = document.querySelector<HTMLElement>('.lgr-calc-dialog-expression-gap[data-position="9"]')!;
    expect(gap.textContent).toBe('');
    expect(gap.getAttribute('aria-label')).toContain('Insert between expression tokens');
    gap.click();
    paletteTabs()[2]!.click();
    paletteItems().find((item) => item.querySelector('code')?.textContent === '+')!.click();
    expect(expressionInput().value).toBe('[revenue] + [cost]');
    expect(fake.applied.at(-1)?.expression).toBe('[revenue] + [cost]');
    expect(validateExpression(expressionInput().value)).toBeNull();
    expect(evaluate(parseExpression(expressionInput().value), {
      resolveColumn: (colId) => colId === 'revenue' ? 12 : 7,
      isResolving: () => false,
    })).toBe(19);
  });

  it('accepts a palette item dropped on a canvas gap', () => {
    const { host } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '' });
    const column = paletteItems().find((item) => item.querySelector('code')?.textContent === '[revenue]')!;
    column.dispatchEvent(new Event('dragstart', { bubbles: true }));
    expect(document.querySelector('.lgr-calc-dialog-expression-canvas')?.getAttribute('data-dragging')).toBe('true');
    document.querySelector<HTMLElement>('.lgr-calc-dialog-expression-gap[data-position="0"]')!
      .dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(expressionInput().value).toBe('[revenue]');
    column.dispatchEvent(new Event('dragend', { bubbles: true }));
    expect(document.querySelector('.lgr-calc-dialog-expression-canvas')?.hasAttribute('data-dragging')).toBe(false);
  });

  it('inserts a palette formula token rather than drag-transfer JSON into the raw expression field', () => {
    const { host } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '' });
    const column = paletteItems().find((item) => item.querySelector('code')?.textContent === '[revenue]')!;
    column.dispatchEvent(new Event('dragstart', { bubbles: true }));
    expressionInput().setSelectionRange(0, 0);
    expressionInput().dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(expressionInput().value).toBe('[revenue]');
    expect(expressionInput().value).not.toContain('{"label"');
    column.dispatchEvent(new Event('dragend', { bubbles: true }));
  });

  it('moves a dragged expression pill to a different insertion target', () => {
    const { host, fake } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '[revenue][cost]' });
    const cost = expressionChips().find((chip) => chip.textContent === '[cost]')!;
    expect(cost.draggable).toBe(true);
    cost.dispatchEvent(new Event('dragstart', { bubbles: true }));
    document.querySelector<HTMLElement>('.lgr-calc-dialog-expression-gap[data-position="0"]')!
      .dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(expressionInput().value).toBe('[cost][revenue]');
    expect(fake.applied.at(-1)?.expression).toBe('[cost][revenue]');
    cost.dispatchEvent(new Event('dragend', { bubbles: true }));
  });

  it('removes a dragged expression pill through the trash target or palette', () => {
    const { host } = makeHost();
    openDialog(host, OPTIONS, { headerName: 'Profit', cellDataType: 'number', expression: '[revenue][cost]' });
    const trash = document.querySelector<HTMLElement>('.lgr-calc-dialog-expression-trash-target')!;
    expect(trash.getAttribute('aria-label')).toContain('drop an expression pill here to remove it');

    let cost = expressionChips().find((chip) => chip.textContent === '[cost]')!;
    cost.dispatchEvent(new Event('dragstart', { bubbles: true }));
    trash.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(expressionInput().value).toBe('[revenue]');
    cost.dispatchEvent(new Event('dragend', { bubbles: true }));

    expressionInput().value = '[revenue][cost]';
    expressionInput().dispatchEvent(new Event('input', { bubbles: true }));
    cost = expressionChips().find((chip) => chip.textContent === '[cost]')!;
    cost.dispatchEvent(new Event('dragstart', { bubbles: true }));
    document.querySelector<HTMLElement>('.lgr-calc-dialog-palette')!
      .dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(expressionInput().value).toBe('[revenue]');
    cost.dispatchEvent(new Event('dragend', { bubbles: true }));
  });

  it('synchronizes typed formulas into chips and preserves malformed raw input', () => {
    const { host } = makeHost();
    openDialog(host);
    const input = expressionInput();
    input.value = '[revenue] * SUM(2)';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const chips = Array.from(document.querySelectorAll<HTMLElement>('.lgr-calc-dialog-expression-chip'));
    expect(chips.map((chip) => chip.textContent)).toEqual(['[revenue]', '*', 'SUM', '(', '2', ')']);
    expect(chips[0]!.classList.contains('lgr-calc-dialog-expression-chip-column')).toBe(true);
    expect(chips[2]!.classList.contains('lgr-calc-dialog-expression-chip-function')).toBe(true);

    input.value = '[revenue';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('[revenue');
    expect(document.querySelector('.lgr-calc-dialog-expression-canvas')?.getAttribute('data-invalid')).toBe('true');
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

  it('traps Tab focus inside the modal', () => {
    const { host } = makeHost();
    const { dialog } = openDialog(host);
    const root = document.querySelector<HTMLElement>('.lgr-calc-dialog')!;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('button, input, select')).filter((element) => !element.closest('[hidden]'));
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    dialog.destroy();
  });
});
