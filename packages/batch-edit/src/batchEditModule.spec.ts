import { describe, expect, it, vi } from 'vitest';
import type { BeanCollection } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { BatchEditModule } from './batchEditModule';
import { batchEditCss } from './batchEditCss';
import { VERSION } from './version';

interface FakeEditSvc {
  startBatchEditing: ReturnType<typeof vi.fn>;
  stopBatchEditing: ReturnType<typeof vi.fn>;
  isBatchEditing: ReturnType<typeof vi.fn>;
}

function makeBeans(editSvc?: FakeEditSvc): { beans: BeanCollection; editSvc: FakeEditSvc | undefined } {
  const svc: FakeEditSvc | undefined =
    editSvc ??
    ({
      startBatchEditing: vi.fn(),
      stopBatchEditing: vi.fn(),
      isBatchEditing: vi.fn(() => true),
    } satisfies FakeEditSvc);
  const beans = { editSvc: svc } as unknown as BeanCollection;
  return { beans, editSvc: svc };
}

describe('BatchEditModule', () => {
  it('registers the BatchEdit module against the reserved api functions', () => {
    expect(BatchEditModule.moduleName).toBe('BatchEdit');
    expect(BatchEditModule.version).toBe(VERSION);
    expect(BatchEditModule.enterprise).toBe(true);
    expect(BatchEditModule.dependsOn).toEqual([EnterpriseCoreModule]);
    expect(BatchEditModule.css).toEqual([batchEditCss]);
    expect(Object.keys(BatchEditModule.apiFunctions).sort()).toEqual([
      'cancelBatchEdit',
      'commitBatchEdit',
      'isBatchEditing',
      'startBatchEdit',
    ]);
  });

  it('ships pending-edit CSS for the Community batch classes', () => {
    expect(batchEditCss).toContain('.ag-cell-batch-edit');
    expect(batchEditCss).toContain('.ag-row-batch-edit');
  });

  it('delegates startBatchEdit to the Community edit service', () => {
    const { beans, editSvc } = makeBeans();
    BatchEditModule.apiFunctions.startBatchEdit(beans);
    expect(editSvc!.startBatchEditing).toHaveBeenCalledTimes(1);
    expect(editSvc!.startBatchEditing).toHaveBeenCalledWith();
  });

  it('commits with commit params (and the api source)', () => {
    const { beans, editSvc } = makeBeans();
    BatchEditModule.apiFunctions.commitBatchEdit(beans);
    expect(editSvc!.stopBatchEditing).toHaveBeenCalledTimes(1);
    expect(editSvc!.stopBatchEditing).toHaveBeenCalledWith({ commit: true, cancel: false, source: 'api' });
  });

  it('cancels with cancel params and no commit flag, so block mode cannot hold a cancel open', () => {
    const { beans, editSvc } = makeBeans();
    BatchEditModule.apiFunctions.cancelBatchEdit(beans);
    expect(editSvc!.stopBatchEditing).toHaveBeenCalledTimes(1);
    expect(editSvc!.stopBatchEditing).toHaveBeenCalledWith({ cancel: true, source: 'api' });
  });

  it('isBatchEditing reflects the Community edit service', () => {
    const on = makeBeans();
    expect(BatchEditModule.apiFunctions.isBatchEditing(on.beans)).toBe(true);

    const off = makeBeans({
      startBatchEditing: vi.fn(),
      stopBatchEditing: vi.fn(),
      isBatchEditing: vi.fn(() => false),
    });
    expect(BatchEditModule.apiFunctions.isBatchEditing(off.beans)).toBe(false);
  });

  it('is a safe no-op when the edit service is absent', () => {
    const beans = {} as unknown as BeanCollection;
    expect(() => BatchEditModule.apiFunctions.startBatchEdit(beans)).not.toThrow();
    expect(() => BatchEditModule.apiFunctions.commitBatchEdit(beans)).not.toThrow();
    expect(() => BatchEditModule.apiFunctions.cancelBatchEdit(beans)).not.toThrow();
    expect(BatchEditModule.apiFunctions.isBatchEditing(beans)).toBe(false);
  });
});
