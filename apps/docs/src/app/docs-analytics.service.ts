import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import { filter, Subscription } from 'rxjs';

import { FIREBASE_CONFIG } from './firebase-config';

/**
 * Analytics is deliberately imported only after the visitor opts in. Keeping
 * the Firebase imports dynamic makes the pre-consent app free of Google
 * Analytics code and measurement requests.
 */
@Injectable({ providedIn: 'root' })
export class DocsAnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private app: FirebaseApp | undefined;
  private analytics: Analytics | undefined;
  private analyticsApi: typeof import('firebase/analytics') | undefined;
  private navigationSubscription: Subscription | undefined;
  private enabled = false;
  private loading: Promise<void> | undefined;

  async enable(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.enabled) return;
    if (this.loading) return this.loading;

    this.loading = this.start();
    try {
      await this.loading;
    } finally {
      this.loading = undefined;
    }
  }

  disable(): void {
    this.enabled = false;
    this.navigationSubscription?.unsubscribe();
    this.navigationSubscription = undefined;

    if (this.analytics && this.analyticsApi) {
      this.analyticsApi.setAnalyticsCollectionEnabled(this.analytics, false);
    }
  }

  private async start(): Promise<void> {
    const [{ getApps, initializeApp }, analyticsApi] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ]);

    if (!(await analyticsApi.isSupported())) return;

    this.app ??= getApps().find((app) => app.name === '[DEFAULT]') ?? initializeApp(FIREBASE_CONFIG);
    this.analyticsApi = analyticsApi;
    this.analytics ??= analyticsApi.getAnalytics(this.app);
    analyticsApi.setAnalyticsCollectionEnabled(this.analytics, true);
    this.enabled = true;

    this.trackPage(this.router.url);
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.trackPage(event.urlAfterRedirects));
  }

  private trackPage(path: string): void {
    if (!this.enabled || !this.analytics || !this.analyticsApi) return;

    this.analyticsApi.logEvent(this.analytics, 'page_view', {
      page_location: this.document.location?.href,
      page_path: path,
      page_title: this.document.title,
    });
  }
}
