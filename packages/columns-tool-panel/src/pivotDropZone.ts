import { Component } from 'ag-grid-community';

export class PivotDropZone extends Component {
  public constructor(horizontal: boolean, embedded = false) {
    super();
    this.setTemplate('<section class="lgr-pivot-drop-zone" role="region" aria-label="Pivot">Pivot available in Phase 8</section>');
    this.getGui().classList.toggle('lgr-pivot-drop-zone-horizontal', horizontal);
    this.getGui().classList.toggle('lgr-pivot-drop-zone-embedded', embedded);
  }
}
