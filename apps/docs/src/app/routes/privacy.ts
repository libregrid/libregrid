import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'lgr-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule],
  template: `
    <article class="lgr-page lgr-policy-page">
      <p class="lgr-eyebrow">Privacy</p>
      <h1>Privacy notice</h1>
      <p class="lgr-policy-effective">Effective on the date libregrid.dev is first published.</p>

      <h2>Who is responsible</h2>
      <p>LibreGrid is an individual hobby project operated by Spencer Easton in the United States. Contact: <a href="mailto:spencer@easton-consulting.com">spencer@easton-consulting.com</a>.</p>

      <h2>What this site processes</h2>
      <p>Firebase Hosting delivers this website. Its service logs may process technical request information, such as IP address, browser details, and request time, to operate and secure the service.</p>
      <p>If you opt in, Firebase Analytics collects anonymous website-usage information, including page views, browser/device information, approximate location, and interaction events. LibreGrid does not use advertising features, Google Signals, user IDs, or custom identifiers.</p>

      <h2>Why and how long</h2>
      <p>Hosting data is used to deliver and protect the site. Optional analytics is used to understand which documentation is useful and to improve the project. Your analytics choice is voluntary and can be withdrawn at any time. Retention is configured in Google Analytics and will be reviewed before launch.</p>

      <h2>Providers and international transfers</h2>
      <p>Firebase Hosting and Firebase Analytics are provided by Google. Processing may involve transfers to the United States and other countries where Google or its service providers operate. Review Google’s applicable data-processing terms and transfer safeguards before launch.</p>

      <h2>Your choices and rights</h2>
      <p>You can reject or withdraw analytics consent without affecting access to LibreGrid. Depending on your location, you may have rights to access, delete, correct, restrict, object to, or receive a copy of personal data, and to complain to a data-protection authority. Contact Spencer using the address above to make a request.</p>

      <p class="lgr-policy-callout">This draft must be reviewed for your launch circumstances and applicable law before publication; it is not legal advice.</p>
      <a matButton="tonal" routerLink="/cookies">Read the cookie notice</a>
    </article>
  `,
})
export class PrivacyPage {}
