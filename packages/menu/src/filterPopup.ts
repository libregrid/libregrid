import type { GridApi, IFilter } from 'ag-grid-community';

/** Filter instances returned by the filter manager carry the comp GUI. */
type FilterWithGui = IFilter & { getGui(): HTMLElement };

/**
 * Opens a column's filter in a self-contained popup under the column header.
 *
 * Used by the column-menu Filter item. Community's `api.showColumnFilter`
 * routes through the enterprise `menuSvc` bean; when that bean is
 * registered, Community's header comp removes the column-menu button, so the
 * menu package deliberately does not register `menuSvc` and opens the
 * filter popup itself.
 *
 * @feature Column Menu -> Filter Popup
 */
export function openColumnFilterPopup(api: GridApi, columnId: string): void {
  void api.getColumnFilterInstance<FilterWithGui>(columnId).then((filter) => {
    const gui = filter?.getGui();
    if (!gui) return;
    const header = document.querySelector<HTMLElement>(`.ag-header-cell[col-id="${columnId}"]`);
    const rect = header?.getBoundingClientRect();

    const popup = document.createElement('div');
    popup.className = 'lgr-column-filter-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', `Filter ${columnId}`);
    Object.assign(popup.style, {
      position: 'fixed',
      zIndex: '1000',
      background: 'var(--ag-background-color, #fff)',
      color: 'var(--ag-foreground-color, #000)',
      padding: '8px',
      border: '1px solid var(--ag-border-color, #ccc)',
      borderRadius: '6px',
      boxShadow: 'var(--ag-popup-shadow, 0 3px 14px rgba(0,0,0,.3))',
      minWidth: '240px',
    });
    if (rect) {
      popup.style.top = `${rect.bottom + 4}px`;
      popup.style.left = `${Math.max(8, rect.left)}px`;
      popup.style.maxHeight = `${Math.max(200, window.innerHeight - rect.bottom - 24)}px`;
      popup.style.overflow = 'auto';
    } else {
      popup.style.top = '20%';
      popup.style.left = '20%';
    }
    popup.append(gui);
    document.body.append(popup);

    const onMouseDown = (event: MouseEvent): void => {
      if (event.target instanceof Node && !popup.contains(event.target)) close();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    const close = (): void => {
      popup.remove();
      document.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      filter?.afterGuiDetached?.();
    };
    // Defer the click-away listener so the opening click cannot close it.
    window.setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown, true);
      window.addEventListener('keydown', onKeyDown, true);
    }, 0);
    filter?.afterGuiAttached?.({ container: 'columnFilter' });
    popup.querySelector<HTMLElement>('input, button, [tabindex]')?.focus();
  });
}
