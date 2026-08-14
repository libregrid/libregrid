import { fromDelimited, toDelimited } from './tsv';

/** Browser-independent Clipboard service used by grid APIs and menu actions. @feature Clipboard */
export class ClipboardService {
  public lastCopied = '';
  public copy(rows: readonly (readonly unknown[])[], delimiter = '\t'): string {
    this.lastCopied = toDelimited(rows, delimiter);
    return this.lastCopied;
  }
  public paste(value: string, delimiter = '\t'): string[][] {
    return fromDelimited(value, delimiter);
  }
}
