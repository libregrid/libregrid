import type { ApplicationRef, EnvironmentInjector } from '@angular/core';
import {
  createMenuDom,
  registerMenuRenderer,
  type MenuRenderer,
  type MenuRenderRequest,
} from '@libregrid/menu';

/**
 * Material-theme menu renderer.
 *
 * This bridge keeps the renderer seam from @libregrid/menu, but delegates the
 * actual menu DOM to the shared Quartz-metrics renderer, so every LibreGrid
 * menu — framework-neutral or Material-hosted — has one identical,
 * theme-native look (docs/design/ux-2-menus.md).
 *
 * The Angular host parameters are retained for the seam signature; the menu
 * itself is plain DOM, which is why no Angular view is attached here.
 */
export function installMaterialMenuRenderer(
  _applicationRef: ApplicationRef,
  _environmentInjector: EnvironmentInjector,
): () => void {
  return registerMenuRenderer(createSharedMenuRenderer());
}

export function createMaterialMenuRenderer(
  _applicationRef: ApplicationRef,
  _environmentInjector: EnvironmentInjector,
): MenuRenderer {
  return createSharedMenuRenderer();
}

function createSharedMenuRenderer(): MenuRenderer {
  return {
    render(request: MenuRenderRequest) {
      const dom = createMenuDom(request.kind, request.items, request.params, {
        closeAll: () => request.onItemSelected?.(),
      });
      return {
        element: dom.element,
        destroy: () => dom.destroy(),
      };
    },
  };
}
