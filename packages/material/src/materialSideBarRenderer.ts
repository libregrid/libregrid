import '@angular/compiler';
import {
  Component,
  Input,
  type ApplicationRef,
  type ComponentRef,
  type EnvironmentInjector,
  type OnChanges,
} from '@angular/core';
import { DomPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import { MatButtonModule } from '@angular/material/button';
import {
  registerSideBarRenderer,
  type SideBarRenderer,
  type SideBarRenderRequest,
} from '@libregrid/side-bar';

@Component({
  selector: 'lgr-material-side-bar-buttons',
  imports: [MatButtonModule],
  template: `
    @for (panel of panelDefs; track panel.id) {
      <button
        mat-button
        type="button"
        class="lgr-side-bar-button"
        role="tab"
        [attr.aria-label]="panel.labelDefault || panel.labelKey || panel.id"
        [attr.aria-expanded]="openedPanelId === panel.id"
        (click)="togglePanel(panel.id)"
      >
        {{ panel.labelDefault || panel.labelKey || panel.id }}
      </button>
    }
  `,
})
class MaterialSideBarButtonsComponent implements OnChanges {
  @Input({ required: true }) request!: SideBarRenderRequest;
  panelDefs: SideBarRenderRequest['panelDefs'] = [];
  openedPanelId: string | null = null;

  ngOnChanges(): void {
    this.panelDefs = this.request.panelDefs;
    this.openedPanelId = this.request.openedPanelId;
  }

  togglePanel(id: string): void {
    this.request.togglePanel(id);
  }
}

export function installMaterialSideBarRenderer(
  applicationRef: ApplicationRef,
  environmentInjector: EnvironmentInjector,
): () => void {
  return registerSideBarRenderer(
    createMaterialSideBarRenderer(applicationRef, environmentInjector),
  );
}

export function createMaterialSideBarRenderer(
  applicationRef: ApplicationRef,
  environmentInjector: EnvironmentInjector,
): SideBarRenderer {
  let outlet: DomPortalOutlet | undefined;
  let component: ComponentRef<MaterialSideBarButtonsComponent> | undefined;
  let host: HTMLElement | undefined;

  return {
    refresh(request) {
      if (host !== request.host) {
        outlet?.dispose();
        host = request.host;
        outlet = new DomPortalOutlet(host, applicationRef, environmentInjector);
        component = outlet.attach(
          new ComponentPortal(MaterialSideBarButtonsComponent, undefined, environmentInjector),
        );
      }
      if (!component) return;
      component.setInput('request', request);
      component.changeDetectorRef.detectChanges();
    },
  };
}
