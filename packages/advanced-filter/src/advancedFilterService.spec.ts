/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { AdvancedFilterExpressionService } from './advancedFilterExpressionService';
import { AdvancedFilterModule } from './advancedFilterModule';
import { AdvancedFilterService } from './advancedFilterService';

function configured(options: Record<string, unknown> = {}) {
  const service = new AdvancedFilterService(); const changed = vi.fn(); const events = vi.fn();
  (service as unknown as { gos: { get(key: string): unknown }; beans: object }).gos = { get: (key: string) => options[key] };
  (service as unknown as { beans: object }).beans = { colModel: { getCols: () => [{ getId: () => 'name', getColDef: () => ({ field: 'name' }) }, { getId: () => 'hidden', getColDef: () => ({ field: 'hidden', hide: true }) }] }, filterManager: { onFilterChanged: changed }, eventSvc: { dispatchEvent: events } };
  return { service, changed, events };
}
describe('AdvancedFilterService options and module API', () => {
  it('uses expression bean delegation, excludes hidden columns, and reports parser errors', () => {
    const { service, changed } = configured();
    expect(service.columns().map((column) => column.id)).toEqual(['name']);
    expect(service.applyExpression('[name] CONTAINS')).toEqual({ error: { message: 'Expected a filter value', position: 15 } });
    expect(service.applyExpression('[name] CONTAINS "x"')).toEqual({}); expect(changed).toHaveBeenCalled();
    expect(service.doesFilterPass({ data: { name: 'x-ray' } } as never)).toBe(true);
    const expression = new AdvancedFilterExpressionService(); expect(expression.serialise(expression.parse('[name] = "x"', [{ id: 'name' }]).model!)).toBe('[name] = "x"');
  });
  it('honours configured header/builder buttons and exercises public API delegates', () => {
    const parent = document.createElement('div'); const { service, events } = configured({ enableAdvancedFilter: true, includeHiddenColumnsInAdvancedFilter: true, advancedFilterParent: parent, advancedFilterParams: { buttons: ['apply', 'clear', 'reset', 'cancel'], suppressBuilderButton: true }, advancedFilterBuilderParams: { buttons: ['clear', 'reset', 'cancel', 'apply'], showMoveButtons: true, suppressFullScreenButton: true, minWidth: 400 } });
    document.body.append(parent); expect(service.columns()).toHaveLength(2);
    service.getCtrl().toggleFilterBuilder({ source: 'api', force: true }); expect(parent.querySelectorAll('button')).not.toHaveLength(0); expect(events).toHaveBeenCalledWith(expect.objectContaining({ visible: true }));
    const api = AdvancedFilterModule.apiFunctions as unknown as Record<string, (beans: object, ...args: never[]) => unknown>;
    expect(api.getAdvancedFilterModel({ advancedFilter: service })).toBeNull(); api.setAdvancedFilterModel({ filterManager: { setAdvFilterModel: vi.fn() } }, null); api.hideAdvancedFilterBuilder({ filterManager: { toggleAdvFilterBuilder: vi.fn() } });
  });
  it('applies, clears, resets, reorders and cancels builder conditions', () => {
    const parent = document.createElement('div'); const { service } = configured({ advancedFilterParent: parent, advancedFilterBuilderParams: { buttons: ['apply', 'clear', 'reset', 'cancel'], showMoveButtons: true } }); document.body.append(parent);
    service.getCtrl().toggleFilterBuilder({ source: 'ui', force: true });
    const click = (label: string) => [...parent.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === label)!.click();
    click('Add condition'); click('Add condition'); click('Move down'); click('Move up'); click('Remove'); click('Clear'); click('Add condition'); click('Apply');
    expect(service.getModel()).toEqual({ filterType: 'text', colId: 'name', type: 'contains', filter: '' });
    service.getCtrl().toggleFilterBuilder({ source: 'ui', force: true }); click('Reset'); expect(service.getModel()).toBeNull();
  });
  it('mounts the accessible header, runs every header action, and safely tears down', () => {
    const { service, changed } = configured({ enableAdvancedFilter: true, advancedFilterParams: { buttons: ['apply', 'clear', 'reset', 'cancel'] }, advancedFilterBuilderParams: { addSelectWidth: 144, pillSelectMinWidth: 90, pillSelectMaxWidth: 160 } });
    const mounted: HTMLElement[] = []; const unmounted = vi.fn();
    service.setModel({ filterType: 'text', colId: 'name', type: 'contains', filter: 'before' });
    service.getCtrl().mountTopSectionComp({ mountComp: (component) => mounted.push(component), unmountComp: unmounted } as never);
    // The host receives a layout spacer; the panel itself renders into the
    // grid root (or the body in a harness) so it stays outside the grid's
    // role=grid element (axe aria-required-children).
    const spacer = mounted[0]!;
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
    const header = document.body.querySelector<HTMLElement>('.lgr-advanced-filter')!;
    expect(service.getCtrl().focusHeaderComp()).toBe(true); expect(service.getCtrl().getHeaderHeight()).toBe(42);
    const input = header.querySelector<HTMLInputElement>('input')!;
    const click = (label: string) => [...header.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === label)!.click();
    input.value = '[name] CONTAINS "after"'; click('Apply'); expect(service.getModel()).toEqual(expect.objectContaining({ filter: 'after' }));
    input.value = 'temporary'; click('Clear'); expect(input.value).toBe('');
    click('Cancel'); expect(input.value).toBe('[name] CONTAINS "after"');
    click('Reset'); expect(service.getModel()).toBeNull(); expect(changed).toHaveBeenCalled();
    click('Builder'); const builder = [...document.querySelectorAll<HTMLElement>('.lgr-advanced-filter-builder')].at(-1)!;
    expect([...builder.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Add condition')?.style.minWidth).toBe('144px');
    expect([...builder.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Full screen')).toBeUndefined();
    service.getCtrl().toggleFilterBuilder({ source: 'api', force: false }); service.getCtrl().destroy();
    expect(unmounted).toHaveBeenCalledWith(spacer);
    expect(header.isConnected).toBe(false);
  });
});
