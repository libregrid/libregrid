import {
  AI_PROTOCOL,
  revisionFor,
  validateGridCommandResponse,
  type GridCommandRequest,
  type GridCommandResponse,
} from '@libregrid/ai-protocol';

export interface GatewayConformanceOptions {
  endpoint: string;
  authorization?: string;
  fetch?: typeof globalThis.fetch;
}

export interface GatewayConformanceReport {
  ok: true;
  endpoint: string;
  protocol: typeof AI_PROTOCOL;
  status: GridCommandResponse['status'];
}

export function conformanceRequest(): GridCommandRequest {
  const gridSchema = {
    type: 'object',
    properties: {
      columnVisibility: {
        type: ['object', 'null'],
        properties: {
          hiddenColIds: { type: 'array', items: { type: 'string', enum: ['customer', 'internalNotes'] } },
        },
        required: ['hiddenColIds'],
        additionalProperties: false,
      },
    },
    required: ['columnVisibility'],
    additionalProperties: false,
  };
  const currentState = { columnVisibility: { hiddenColIds: [] } };
  return {
    protocol: AI_PROTOCOL,
    requestId: 'libregrid-conformance',
    revision: revisionFor({ gridSchema, currentState }),
    command: 'Hide internal notes',
    gridSchema,
    currentState,
    context: { totalRecordCount: 2 },
  };
}

export async function runGatewayConformance(options: GatewayConformanceOptions): Promise<GatewayConformanceReport> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-gateway: fetch is unavailable');
  const request = conformanceRequest();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.authorization) headers.authorization = options.authorization;
  const response = await fetchImplementation(options.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new Error(`AI gateway returned non-JSON data (HTTP ${response.status})`, { cause });
  }
  const validated = validateGridCommandResponse(request, payload);
  if (!validated.ok) {
    throw new Error(`AI gateway response is not conformant: ${validated.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ')}`);
  }
  if (!response.ok) throw new Error(`AI gateway returned a conformant error: ${JSON.stringify(validated.value)}`);
  return { ok: true, endpoint: options.endpoint, protocol: AI_PROTOCOL, status: validated.value.status };
}
