/** A serialisable rectangular selection independent of the grid renderer. @feature Cell Selection */
export interface CellRangeModel {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
}

/** Normalises drag boundaries and provides range, fill, and clear primitives. @feature Cell Selection */
export class RangeModel {
  private ranges: CellRangeModel[] = [];

  public getRanges(): readonly CellRangeModel[] {
    return this.ranges;
  }
  public setRange(range: CellRangeModel, append = false): void {
    this.ranges = append ? [...this.ranges, normalise(range)] : [normalise(range)];
  }
  public clear(): void {
    this.ranges = [];
  }
  public contains(row: number, column: number): boolean {
    return this.ranges.some(
      (range) =>
        row >= range.startRow &&
        row <= range.endRow &&
        column >= range.startColumn &&
        column <= range.endColumn,
    );
  }
  public extendLatest(row: number, column: number): void {
    const latest = this.ranges.at(-1);
    if (latest)
      this.ranges[this.ranges.length - 1] = normalise({
        ...latest,
        endRow: row,
        endColumn: column,
      });
  }
  public fill(values: readonly unknown[], length: number): unknown[] {
    return fillSeries(values, length);
  }
}

export function normalise(range: CellRangeModel): CellRangeModel {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    endRow: Math.max(range.startRow, range.endRow),
    startColumn: Math.min(range.startColumn, range.endColumn),
    endColumn: Math.max(range.startColumn, range.endColumn),
  };
}

/** Continues arithmetic number/date sequences and otherwise repeats source values. @feature Cell Selection */
export function fillSeries(values: readonly unknown[], length: number): unknown[] {
  if (length <= 0 || values.length === 0) return [];
  const numeric = values.every((value) => typeof value === 'number');
  if (numeric && values.length >= 2) {
    const step = (values[1] as number) - (values[0] as number);
    return Array.from({ length }, (_, index) =>
      index < values.length ? values[index] : (values[0] as number) + step * index,
    );
  }
  const dates = values.every((value) => value instanceof Date);
  if (dates && values.length >= 2) {
    const first = values[0] as Date;
    const second = values[1] as Date;
    const step = second.getTime() - first.getTime();
    const weekdays =
      values.length >= 3 &&
      step === 86_400_000 &&
      values.every((value) => {
        const day = (value as Date).getUTCDay();
        return day !== 0 && day !== 6;
      });
    const nextWeekday = (date: Date): Date => {
      const next = new Date(date.getTime() + 86_400_000);
      if (next.getUTCDay() === 6) next.setUTCDate(next.getUTCDate() + 2);
      return next;
    };
    const filled: Date[] = values.map((value) => new Date((value as Date).getTime()));
    while (filled.length < length)
      filled.push(
        weekdays ? nextWeekday(filled.at(-1)!) : new Date(first.getTime() + step * filled.length),
      );
    return filled;
  }
  return Array.from({ length }, (_, index) => values[index % values.length]);
}
