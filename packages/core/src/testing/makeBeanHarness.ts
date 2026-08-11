import type { BeanCollection, GridOptions } from 'ag-grid-community';

/**
 * Unit-test harness for a bean in isolation — standards.md §7.1.
 *
 * A `BeanStub` is never constructed with arguments. Community's DI container
 * calls `preWireBeans(beans)` to inject the `BeanCollection` (which is where
 * the protected `this.beans` and `this.gos` come from), and then calls
 * `postConstruct()`. This harness reproduces exactly that sequence.
 *
 * The stub `gos` implements the `IPropertiesService` surface `AgBeanStub`
 * actually uses. It is deliberately minimal: if a bean reaches for something
 * the stub does not implement, the test fails loudly and the harness is
 * extended. That is preferable to a permissive mock that hides real coupling.
 *
 * For anything involving the row model, columns or rendering, use an
 * integration test against a real grid (standards.md §7.2) instead — a unit
 * harness cannot prove the seam works.
 */

type PropertyListener = (event: {
  type: string;
  currentValue: unknown;
  previousValue: unknown;
  changeSet: undefined;
  source: 'api';
}) => void;

export interface StubGos {
  readonly beanName: 'gos';
  get(property: string): unknown;
  /** Test helper — updates a value and notifies managed property listeners. */
  set(property: string, value: unknown): void;
  addPropertyEventListener(event: string, listener: PropertyListener): void;
  removePropertyEventListener(event: string, listener: PropertyListener): void;
  addCommon<T>(params: T): T;
  setInstanceDomData(element: HTMLElement): void;
  isElementInThisInstance(element: HTMLElement): boolean;
}

function createStubGos(gridOptions: Partial<GridOptions>): StubGos {
  const values = new Map<string, unknown>(Object.entries(gridOptions));
  const listeners = new Map<string, Set<PropertyListener>>();

  return {
    beanName: 'gos',
    get: (property) => values.get(property),
    set(property, value) {
      const previousValue = values.get(property);
      values.set(property, value);
      for (const l of listeners.get(property) ?? []) {
        l({ type: property, currentValue: value, previousValue, changeSet: undefined, source: 'api' });
      }
    },
    addPropertyEventListener(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener);
    },
    removePropertyEventListener(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    addCommon: (params) => params,
    setInstanceDomData: () => undefined,
    isElementInThisInstance: () => true,
  };
}

function createStubEventService() {
  const handlers = new Map<string, Set<(e: unknown) => void>>();
  return {
    addEventListener(type: string, fn: (e: unknown) => void) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener(type: string, fn: (e: unknown) => void) {
      handlers.get(type)?.delete(fn);
    },
    dispatchEvent(event: { type: string }) {
      for (const fn of handlers.get(event.type) ?? []) fn(event);
    },
  };
}

export interface BeanHarness<T> {
  /** The bean under test, fully wired and post-constructed. */
  bean: T;
  /** The stub `BeanCollection` — add or inspect collaborators here. */
  beans: BeanCollection;
  /** The stub properties service. Use `gos.set()` to trigger property listeners. */
  gos: StubGos;
  /** Destroys the bean, running its registered teardown. */
  destroy(): void;
}

export interface BeanHarnessOptions {
  /** Initial grid options visible via `this.gos.get(...)`. */
  gridOptions?: Partial<GridOptions>;
  /** Additional beans placed on the collection, keyed by bean name. */
  beans?: Record<string, unknown>;
}

/**
 * Construct, wire and post-construct a bean for unit testing.
 *
 * @example
 * const { bean, gos } = makeBeanHarness(AggFuncService, { gridOptions: {} });
 * expect(bean.getAggFunc('sum')!([1, null, 2])).toBe(3);
 */
export function makeBeanHarness<T extends object>(
  BeanClass: new () => T,
  options: BeanHarnessOptions = {},
): BeanHarness<T> {
  const gos = createStubGos(options.gridOptions ?? {});
  const beans = {
    gos,
    eventSvc: createStubEventService(),
    ...options.beans,
  } as unknown as BeanCollection;

  const bean = new BeanClass();

  // Community's context calls these two in order. `preWireBeans` is what sets
  // the protected `this.beans` / `this.gos`.
  const wired = bean as unknown as {
    preWireBeans?(b: BeanCollection): void;
    postConstruct?(): void;
    destroy?(): void;
    beanName?: string;
  };

  wired.preWireBeans?.(beans);

  // Self-register so collaborators resolving this bean by name find it.
  if (wired.beanName) {
    (beans as unknown as Record<string, unknown>)[wired.beanName] = bean;
  }

  wired.postConstruct?.();

  return {
    bean,
    beans,
    gos,
    destroy: () => wired.destroy?.(),
  };
}
