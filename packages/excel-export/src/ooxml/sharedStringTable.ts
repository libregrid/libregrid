/** Deduplicating table backing the xl/sharedStrings.xml part. */
export class SharedStringTable {
  private readonly entries: string[] = [];
  private readonly lookup = new Map<string, number>();
  private refCount = 0;

  /** Return the zero-based index for `value`, inserting it on first use. */
  public add(value: string): number {
    const index = this.intern(value);
    this.refCount++;
    return index;
  }

  /** Look up an already-interned string without counting a new reference. */
  public indexOf(value: string): number | undefined {
    return this.lookup.get(value);
  }

  /** Total cell references (the `count` attribute of `<sst>`). */
  public get count(): number {
    return this.refCount;
  }

  /** Number of distinct strings (the `uniqueCount` attribute of `<sst>`). */
  public get uniqueCount(): number {
    return this.entries.length;
  }

  /** Distinct strings in index order. */
  public values(): readonly string[] {
    return this.entries;
  }

  private intern(value: string): number {
    const existing = this.lookup.get(value);
    if (existing !== undefined) return existing;
    const index = this.entries.length;
    this.lookup.set(value, index);
    this.entries.push(value);
    return index;
  }
}
