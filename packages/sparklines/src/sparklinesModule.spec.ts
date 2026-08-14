import { describe, expect, it } from 'vitest';
import { SparklinesModule } from './sparklinesModule';

describe('SparklinesModule', () => {
  it('registers the standard component and its scoped styling', () => {
    expect(SparklinesModule.moduleName).toBe('Sparklines'); expect(SparklinesModule.userComponents?.agSparklineCellRenderer).toBeTruthy(); expect(SparklinesModule.css?.[0]?.includes('.lgr-sparkline')).toBe(true);
  });
});
