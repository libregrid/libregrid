import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Raw Vitest does not initialise Angular's JIT testing platform.  Keep the
// bootstrap here so material specs and the coverage runner exercise the same
// runtime path as the Angular test builder.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
