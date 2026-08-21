import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { DocsAnalyticsService } from './docs-analytics.service';

interface KlaroService {
  name: string;
  purposes: readonly string[];
  required?: boolean;
  cookies?: readonly string[];
  callback?: (consent: boolean) => void;
}

interface KlaroConfig {
  version: number;
  elementID: string;
  storageMethod: 'cookie';
  storageName: string;
  cookieExpiresAfterDays: number;
  default: boolean;
  mustConsent: boolean;
  acceptAll: boolean;
  hideDeclineAll: boolean;
  noticeAsModal: boolean;
  noAutoLoad: boolean;
  htmlTexts: boolean;
  translations: Record<string, unknown>;
  services: readonly KlaroService[];
}

interface KlaroApi {
  getManager(config?: KlaroConfig): { confirmed: boolean };
  show(config?: KlaroConfig, modal?: boolean): void;
}

declare global {
  interface Window {
    klaro?: KlaroApi;
    klaroConfig?: KlaroConfig;
  }
}

/** Controls the locally hosted Klaro dialog and gates optional analytics. */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(DocsAnalyticsService);
  private loadPromise: Promise<void> | undefined;

  private readonly config: KlaroConfig = {
    version: 1,
    elementID: 'klaro',
    storageMethod: 'cookie',
    storageName: 'libregrid-consent',
    cookieExpiresAfterDays: 180,
    default: false,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    noticeAsModal: false,
    noAutoLoad: true,
    htmlTexts: true,
    translations: {
      en: {
        ok: 'Accept analytics',
        acceptAll: 'Accept analytics',
        decline: 'Reject analytics',
        save: 'Save choices',
        privacyPolicyUrl: '/privacy',
        consentNotice: {
          learnMore: 'Settings',
          description:
            'LibreGrid uses a necessary preference cookie and optional anonymous analytics. You can accept analytics, reject it, or choose in Settings. <a href="/cookies">Learn about cookies</a>.',
        },
        consentModal: {
          title: 'Privacy choices',
          description:
            'Choose whether LibreGrid may collect anonymous usage analytics. Necessary consent preferences are always active so we can remember your choice.',
        },
        purposes: {
          analytics: 'Anonymous analytics',
        },
        firebaseAnalytics: {
          title: 'Firebase Analytics',
          description:
            'Measures anonymous documentation visits and page views to help improve LibreGrid. It is provided by Google and starts only if you opt in.',
        },
      },
    },
    services: [
      {
        name: 'firebaseAnalytics',
        purposes: ['analytics'],
        cookies: ['^_ga', '^_gid', '^_gat'],
        callback: (consent) => {
          if (consent) {
            void this.analytics.enable();
          } else {
            this.analytics.disable();
          }
        },
      },
    ],
  };

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.load().then(() => {
      // Creating the manager restores and applies a saved choice. `show()`
      // intentionally forces Klaro's UI open, so call it only for a visitor
      // who has not confirmed a choice yet.
      const manager = window.klaro?.getManager(this.config);
      if (!manager?.confirmed) this.show(false);
    });
  }

  showSettings(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.load().then(() => this.show(true));
  }

  private show(asModal: boolean): void {
    window.klaro?.show(this.config, asModal);
    const notice = this.document.getElementById('klaro-cookie-notice');
    if (!notice) return;
    // Klaro's non-modal notice references a title it does not render. Give the
    // dialog a direct accessible name instead of leaving a broken reference.
    notice.removeAttribute('aria-labelledby');
    notice.setAttribute('aria-label', 'Cookie preferences');
  }

  private load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      window.klaroConfig = this.config;
      const script = this.document.createElement('script');
      script.src = 'assets/vendor/klaro/klaro-no-css.js';
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the LibreGrid consent manager.'));
      this.document.head.append(script);
    });
    return this.loadPromise;
  }
}
