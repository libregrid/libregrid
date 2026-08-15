import type { ExcelCell, ExcelStyle } from 'ag-grid-community';
import { StyleRegistry } from './styleRegistry';

/** Copy an ExcelStyle, dropping properties left undefined (array merges). */
function defined(style: ExcelStyle): Partial<ExcelStyle> {
  const out: Partial<ExcelStyle> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/**
 * Resolves `cell.styleId` references against a configured ExcelStyle list.
 * A string id resolves to its style; an array of ids merges left to right
 * with later styles winning. Unknown ids resolve to no style.
 */
export class StyleResolver {
  private readonly byId = new Map<string, ExcelStyle>();
  /** The registry backing styles.xml — register styles only through indexFor. */
  public readonly registry: StyleRegistry;

  constructor(styles: ExcelStyle[], defaultFontSize?: number) {
    this.registry = new StyleRegistry(defaultFontSize ?? 11);
    for (const style of styles) this.byId.set(style.id, style);
  }

  /** Resolve a cell's styleId(s) to a cellXf index, or undefined for no style. */
  public indexFor(cell: ExcelCell): number | undefined {
    const styleId = cell.styleId;
    if (styleId === undefined) return undefined;
    if (typeof styleId === 'string') {
      const style = this.byId.get(styleId);
      return style ? this.registry.register(style) : undefined;
    }
    let merged: ExcelStyle = { id: '' };
    let found = false;
    for (const id of styleId) {
      const style = this.byId.get(id);
      if (!style) continue;
      found = true;
      merged = { ...merged, ...defined(style) };
    }
    return found ? this.registry.register(merged) : undefined;
  }
}
