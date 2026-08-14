/** @vitest-environment jsdom */
import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LibreGridThemeService, provideLibreGridMaterialTheme } from './themeBridge';
import { buildGridTheme } from './themeParams';

describe('LibreGridThemeService', () => {
  it('reads Material token probes and updates the host theme mode', () => {
    const root = document.createElement('div');
    root.style.setProperty('--mat-sys-primary', '#005cbb');
    root.style.setProperty('--mat-sys-surface', '#faf9fd');
    document.body.appendChild(root);

    TestBed.configureTestingModule({
      providers: [
        provideLibreGridMaterialTheme({ root, density: -2 }),
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    const service = TestBed.inject(LibreGridThemeService);
    service.refresh();
    service.toggle();
    TestBed.tick();

    expect(root.getAttribute('data-lgr-theme')).toBe('dark');
    expect(service.gridTheme()).toBeDefined();
    TestBed.resetTestingModule();
    root.remove();
  });

  it('does not install browser renderers during server-side rendering', () => {
    TestBed.configureTestingModule({
      providers: [
        provideLibreGridMaterialTheme(),
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    expect(TestBed.inject(LibreGridThemeService).gridTheme()).toBeDefined();
    TestBed.resetTestingModule();
  });

  it('uses fallback token values when the host cannot resolve Material tokens', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    expect(() => buildGridTheme(root, 3)).not.toThrow();
    expect(() => buildGridTheme(root, -10)).not.toThrow();
    root.remove();
  });
});
