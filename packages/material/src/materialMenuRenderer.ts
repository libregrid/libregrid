import '@angular/compiler';
import {
  Component,
  createComponent,
  type ApplicationRef,
  type EnvironmentInjector,
  type ComponentRef,
} from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import type { MenuItemDef } from 'ag-grid-community';
import { registerMenuRenderer, type MenuRenderer, type MenuRenderRequest } from '@libregrid/menu';

@Component({
  selector: 'lgr-material-menu',
  imports: [MatMenuModule, MatIconModule],
  template: `
    <div
      class="lgr-menu lgr-material-menu"
      [class.lgr-context-menu]="kind === 'context'"
      [class.lgr-column-menu]="kind === 'column'"
      role="menu"
      (keydown)="onKeydown($event)"
    >
      @for (item of items; track item.name) {
        <button
          mat-menu-item
          class="lgr-menu-item"
          type="button"
          [disabled]="!!item.disabled"
          [attr.aria-checked]="item.checked || null"
          [title]="item.tooltip || ''"
          [attr.aria-expanded]="item.subMenu ? expanded === item : null"
          (click)="select(item)"
        >
          @if (item.checked) {
            <mat-icon aria-hidden="true">check</mat-icon>
          }
          <span>{{ item.name }}</span>
          @if (item.shortcut) {
            <span class="lgr-menu-item-shortcut">{{ item.shortcut }}</span>
          }
          @if (item.subMenu?.length) {
            <span aria-hidden="true">›</span>
          }
        </button>
        @if (expanded === item && children(item).length) {
          <div class="lgr-menu lgr-sub-menu" role="menu">
            @for (child of children(item); track child.name) {
              <button
                mat-menu-item
                class="lgr-menu-item"
                type="button"
                [disabled]="!!child.disabled"
                (click)="select(child)"
              >
                <span>{{ child.name }}</span>
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
class MaterialMenuComponent {
  items: MenuItemDef[] = [];
  kind: 'context' | 'column' = 'context';
  request!: MenuRenderRequest;
  expanded: MenuItemDef | null = null;

  select(item: MenuItemDef): void {
    if (this.children(item).length) {
      this.expanded = this.expanded === item ? null : item;
      return;
    }
    if (!item.disabled && item.action) {
      item.action(this.request.params as never);
      if (!item.suppressCloseOnSelect) this.request.onItemSelected?.();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const items = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        '.lgr-menu-item:not([disabled])',
      ),
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    } else if (event.key === 'ArrowRight') {
      const item = this.items[index];
      if (item && this.children(item).length) {
        this.expanded = item;
        queueMicrotask(() =>
          (event.currentTarget as HTMLElement)
            .querySelector<HTMLElement>('.lgr-sub-menu .lgr-menu-item')
            ?.focus(),
        );
      }
    } else if (event.key === 'ArrowLeft') {
      this.expanded = null;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.request.onItemSelected?.();
    }
  }

  children(item: MenuItemDef): MenuItemDef[] {
    return item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [];
  }
}

export function installMaterialMenuRenderer(
  applicationRef: ApplicationRef,
  environmentInjector: EnvironmentInjector,
): () => void {
  return registerMenuRenderer(createMaterialMenuRenderer(applicationRef, environmentInjector));
}

export function createMaterialMenuRenderer(
  applicationRef: ApplicationRef,
  environmentInjector: EnvironmentInjector,
): MenuRenderer {
  return {
    render(request) {
      const host = document.createElement('div');
      const component = createComponent(MaterialMenuComponent, {
        environmentInjector,
        hostElement: host,
      });
      component.instance.items = request.items;
      component.instance.kind = request.kind;
      component.instance.request = request;
      applicationRef.attachView(component.hostView);
      component.changeDetectorRef.detectChanges();
      return {
        element: host,
        destroy: () => destroyMaterialMenu(applicationRef, component),
      };
    },
  };
}

function destroyMaterialMenu(
  applicationRef: ApplicationRef,
  component: ComponentRef<MaterialMenuComponent>,
): void {
  applicationRef.detachView(component.hostView);
  component.destroy();
}
