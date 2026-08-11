import { describe, it, expect } from 'vitest';
import type { BeanCollection } from 'ag-grid-community';
import { asBean, getUntypedBean, type IStatusBarSvcShape } from './untypedBeans';

/**
 * These helpers are the ONLY sanctioned place to cast Community's
 * `UntypedBeanNames` slots (standards.md §6 rule 1). If they misbehave, every
 * consumer of an untyped bean is unsafe — so they are tested despite being
 * small.
 */
describe('untypedBeans', () => {
  const beans = {
    statusBarSvc: { refresh: () => 'refreshed' },
    colModel: {},
  } as unknown as BeanCollection;

  describe('getUntypedBean', () => {
    it('returns the bean when the slot is populated', () => {
      const svc = getUntypedBean<IStatusBarSvcShape>(beans, 'statusBarSvc');
      expect(svc).toBeDefined();
      expect(svc!.refresh()).toBe('refreshed');
    });

    it('returns undefined for an unregistered slot', () => {
      // This is the whole point: a feature package must be able to detect that
      // an optional collaborator is absent and degrade, rather than throw.
      // See package-architecture.md §4.
      expect(getUntypedBean(beans, 'ssrmStoreFactory')).toBeUndefined();
    });

    it('does not throw on an empty collection', () => {
      const empty = {} as unknown as BeanCollection;
      expect(() => getUntypedBean(empty, 'anything')).not.toThrow();
      expect(getUntypedBean(empty, 'anything')).toBeUndefined();
    });
  });

  describe('asBean', () => {
    it('narrows a value to the declared shape', () => {
      const svc = asBean<IStatusBarSvcShape>({ refresh: () => 'ok' });
      expect(svc!.refresh()).toBe('ok');
    });

    it('passes undefined through', () => {
      expect(asBean<IStatusBarSvcShape>(undefined)).toBeUndefined();
    });
  });
});
