import { describe, it, expect, vi } from 'vitest';
import { assertSingleCoreInstance, _CORE_INSTANCE_KEY } from './singletonGuard';

describe('assertSingleCoreInstance (package-architecture.md §7)', () => {
  const freshScope = () => ({}) as { [_CORE_INSTANCE_KEY]?: string };

  it('accepts the first instance', () => {
    const warn = vi.fn();
    expect(assertSingleCoreInstance('0.1.0', freshScope(), warn)).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts a repeat call with the same version (onRegister is idempotent)', () => {
    const scope = freshScope();
    const warn = vi.fn();
    assertSingleCoreInstance('0.1.0', scope, warn);
    expect(assertSingleCoreInstance('0.1.0', scope, warn)).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('WARNS when a second, different core version is detected', () => {
    const scope = freshScope();
    const warn = vi.fn();
    assertSingleCoreInstance('0.1.0', scope, warn);

    expect(assertSingleCoreInstance('0.2.0', scope, warn)).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toContain('Two copies of @libregrid/core');
    expect(warn.mock.calls[0]![0]).toContain('0.1.0');
    expect(warn.mock.calls[0]![0]).toContain('0.2.0');
  });

  it('uses a cross-realm Symbol.for key so duplicates are actually detectable', () => {
    expect(_CORE_INSTANCE_KEY).toBe(Symbol.for('libregrid.core.instance'));
  });
});
