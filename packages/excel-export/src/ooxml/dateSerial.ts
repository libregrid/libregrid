const MS_PER_DAY = 86_400_000;
/** 1900-01-01T00:00:00Z — serial 1 in the Excel 1900 date system. */
const EPOCH_1900 = Date.UTC(1900, 0, 1);
/** 1900-03-01T00:00:00Z — the first real date after the phantom 1900-02-29. */
const LEAP_BUG_START = Date.UTC(1900, 2, 1);

/**
 * Convert a Date to an Excel 1900-system serial number, reproducing the
 * intentional leap-year bug: day 60 is the phantom 1900-02-29, so every
 * date from 1900-03-01 counts one extra day.
 *
 * Returns null when the date cannot be represented: invalid dates and
 * dates before 1900-01-01 (the 1900 system has no serial for them).
 */
export function dateToExcelSerial(date: Date): number | null {
  const time = date.getTime();
  if (Number.isNaN(time) || time < EPOCH_1900) return null;
  const days = (time - EPOCH_1900) / MS_PER_DAY;
  const serial = days + 1;
  return time >= LEAP_BUG_START ? serial + 1 : serial;
}

/** Parse an ISO 8601 string and convert it to an Excel 1900 serial number. */
export function isoToExcelSerial(value: string): number | null {
  return dateToExcelSerial(new Date(value));
}

/** Serialise a serial number without binary floating-point noise. */
export function formatExcelSerial(serial: number): string {
  return String(Math.round(serial * 1e9) / 1e9);
}
