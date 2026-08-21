import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { ConsentService } from '../consent.service';

@Component({
  selector: 'lgr-cookies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule],
  template: `
    <article class="lgr-page lgr-policy-page">
      <p class="lgr-eyebrow">Cookies</p>
      <h1>Cookie notice</h1>
      <p class="lgr-policy-effective">Effective on the date libregrid.dev is first published.</p>

      <h2>Necessary preference cookie</h2>
      <p><code>libregrid-consent</code> remembers whether you accepted or rejected optional analytics. It is necessary to retain your choice and expires after 180 days.</p>

      <h2>Optional analytics cookies</h2>
      <p>Only after you opt in, Firebase Analytics may set Google Analytics cookies such as <code>_ga</code>, <code>_gid</code>, and <code>_gat</code> to measure anonymous usage. Rejecting analytics prevents these cookies from being set; changing your choice removes cookies matched by the consent manager where the browser permits.</p>

      <h2>Manage your choices</h2>
      <p>You may change or withdraw your optional analytics consent at any time. Withdrawing consent stops future analytics collection immediately.</p>
      <button matButton="filled" type="button" (click)="consent.showSettings()">Privacy choices</button>

      <p class="lgr-policy-callout">This draft must be reviewed for your launch circumstances and applicable law before publication; it is not legal advice.</p>
      <a matButton="tonal" routerLink="/privacy">Read the privacy notice</a>
    </article>
  `,
})
export class CookiesPage {
  protected readonly consent = inject(ConsentService);
}
