const DEFAULT_GATEWAY_TIMEOUT_MS = 30_000;

export function parseGatewayTimeoutMs(value: string | undefined): number {
  if (value === undefined) return DEFAULT_GATEWAY_TIMEOUT_MS;
  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('GATEWAY_TIMEOUT_MS must be a positive integer');
  }
  return timeoutMs;
}
