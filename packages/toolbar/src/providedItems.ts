import type { GridApi } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import type { ToolbarItemFactoryResult } from './toolbarRegistry';

/**
 * Provided toolbar items shipped in the toolbar package itself.
 * Feature-specific items (row group panel, pivot panel, menu) are registered
 * by their owning packages via registerToolbarItem.
 */

interface FindApi {
  findNext?: () => void;
  findPrevious?: () => void;
  findGetTotalMatches?: () => number;
  getGridOption?: (key: string) => unknown;
  setGridOption?: (key: string, value: unknown) => void;
}

type GridApiLike = GridApi & {
  getGridOption(key: string): unknown;
  setGridOption(key: string, value: unknown): void;
};

/** Quick Filter input bound to the grid's quickFilter option. */
export function createQuickFilterToolbarItem(api: GridApi): ToolbarItemFactoryResult {
  const wrap = document.createElement('span');
  wrap.className = 'lgr-toolbar-input-wrap';

  const icon = document.createElement('span');
  icon.className = 'lgr-toolbar-input-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = iconSvg('search') ?? '';

  const input = document.createElement('input');
  input.className = 'lgr-toolbar-input';
  input.type = 'search';
  input.placeholder = 'Quick filter';
  input.setAttribute('aria-label', 'Quick filter');
  const apiLike = api as unknown as GridApiLike;
  input.value = (apiLike.getGridOption('quickFilterText') as string | undefined) ?? '';
  input.addEventListener('input', () => apiLike.setGridOption('quickFilterText', input.value));

  wrap.append(icon, input);
  return { gui: wrap, instance: input };
}

/** Find input with match count and previous/next navigation. */
export function createFindToolbarItem(api: GridApi): ToolbarItemFactoryResult {
  const findApi = api as unknown as FindApi;
  const wrap = document.createElement('span');
  wrap.className = 'lgr-toolbar-input-wrap';

  const icon = document.createElement('span');
  icon.className = 'lgr-toolbar-input-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = iconSvg('search') ?? '';

  const input = document.createElement('input');
  input.className = 'lgr-toolbar-input lgr-toolbar-find-input';
  input.type = 'search';
  input.placeholder = 'Find';
  input.setAttribute('aria-label', 'Find in grid');
  const apiLike = api as unknown as GridApiLike;
  input.value = (apiLike.getGridOption('findSearchValue') as string | undefined) ?? '';
  input.addEventListener('input', () => apiLike.setGridOption('findSearchValue', input.value));

  const count = document.createElement('span');
  count.className = 'lgr-toolbar-find-count';
  count.setAttribute('aria-live', 'polite');
  const updateCount = (): void => {
    count.textContent = String(findApi.findGetTotalMatches?.() ?? 0);
  };
  updateCount();
  api.addEventListener('findChanged', updateCount);

  const previous = createToolbarButton('Previous match', 'previous', () => findApi.findPrevious?.());
  const next = createToolbarButton('Next match', 'next', () => findApi.findNext?.());
  previous.disabled = !findApi.findPrevious;
  next.disabled = !findApi.findNext;

  wrap.append(icon, input);
  const group = document.createElement('span');
  group.className = 'lgr-toolbar-find-group';
  group.append(wrap, count, previous, next);

  return {
    gui: group,
    instance: input,
    destroy: () => api.removeEventListener('findChanged', updateCount),
  };
}

function createToolbarButton(label: string, icon: 'previous' | 'next', action: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lgr-toolbar-button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = iconSvg(icon) ?? label;
  button.addEventListener('click', action);
  return button;
}
