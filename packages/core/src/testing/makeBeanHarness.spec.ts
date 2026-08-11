import { describe, it, expect, vi } from 'vitest';
import { BeanStub, type NamedBean } from 'ag-grid-community';
import { makeBeanHarness } from './makeBeanHarness';

/**
 * Self-test for the harness itself. If these fail, every downstream unit test
 * is untrustworthy.
 *
 * The bean below is written exactly as api-seams.md §5 prescribes:
 * no-arg constructor, `beanName` with `as const`, setup in `postConstruct()`.
 */
class ExampleService extends BeanStub implements NamedBean {
  beanName = 'exampleSvc' as const;

  postConstructCalled = false;
  destroyed = false;
  observed: unknown[] = [];

  public postConstruct(): void {
    this.postConstructCalled = true;
    this.addManagedPropertyListener('rowHeight', (e) => this.observed.push(e.currentValue));
    this.addDestroyFunc(() => {
      this.destroyed = true;
    });
  }

  readRowHeight(): unknown {
    return this.gos.get('rowHeight');
  }

  hasCollaborator(name: string): boolean {
    return (this.beans as unknown as Record<string, unknown>)[name] !== undefined;
  }
}

describe('makeBeanHarness', () => {
  it('wires the bean and calls postConstruct', () => {
    const { bean } = makeBeanHarness(ExampleService);
    expect(bean.postConstructCalled).toBe(true);
  });

  it('exposes gridOptions through this.gos', () => {
    const { bean } = makeBeanHarness(ExampleService, { gridOptions: { rowHeight: 42 } });
    expect(bean.readRowHeight()).toBe(42);
  });

  it('delivers managed property changes via gos.set()', () => {
    const { bean, gos } = makeBeanHarness(ExampleService, { gridOptions: { rowHeight: 10 } });
    gos.set('rowHeight', 25);
    gos.set('rowHeight', 30);
    expect(bean.observed).toEqual([25, 30]);
  });

  it('self-registers the bean on the collection under its beanName', () => {
    const { bean, beans } = makeBeanHarness(ExampleService);
    expect((beans as unknown as Record<string, unknown>)['exampleSvc']).toBe(bean);
  });

  it('injects additional collaborator beans', () => {
    const { bean } = makeBeanHarness(ExampleService, {
      beans: { aggFuncSvc: { getAggFunc: vi.fn() } },
    });
    expect(bean.hasCollaborator('aggFuncSvc')).toBe(true);
  });

  it('runs registered teardown on destroy()', () => {
    const { bean, destroy } = makeBeanHarness(ExampleService);
    expect(bean.destroyed).toBe(false);
    destroy();
    expect(bean.destroyed).toBe(true);
  });

  it('stops delivering property changes after destroy (no leaks)', () => {
    const { bean, gos, destroy } = makeBeanHarness(ExampleService);
    gos.set('rowHeight', 1);
    destroy();
    gos.set('rowHeight', 2);
    expect(bean.observed).toEqual([1]);
  });
});
