/** @vitest-environment jsdom */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MaterialStatusBarComponent } from './materialStatusBar';

describe('MaterialStatusBarComponent', () => {
  it('renders live status text inside the Material toolbar shell', () => {
    const fixture = TestBed.createComponent(MaterialStatusBarComponent);
    fixture.componentRef.setInput('text', 'Ranges: 1 · Count: 3');
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const toolbar = nativeElement.querySelector<HTMLElement>('mat-toolbar');
    expect(toolbar?.getAttribute('role')).toBe('status');
    expect(toolbar?.getAttribute('aria-live')).toBe('polite');
    expect(toolbar?.textContent).toContain('Ranges: 1 · Count: 3');

    fixture.destroy();
    TestBed.resetTestingModule();
  });
});
