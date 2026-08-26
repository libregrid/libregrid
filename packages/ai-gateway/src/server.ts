import { createGridCommandHandler } from './gateway';
import { listenNodeGateway } from './nodeServer';
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';
import { createOpenAiResponsesProvider } from './openAiResponsesProvider';
import type { GridModelProvider } from './provider';
import { parseGatewayTimeoutMs } from './serverConfig';
import { createTurnstileAuthorizer } from './turnstile';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is required');

const kind = process.env.AI_PROVIDER ?? 'openai-responses';
if (kind !== 'openai-responses' && kind !== 'openai-chat') {
  throw new Error('AI_PROVIDER must be "openai-responses" or "openai-chat"');
}

const model = process.env.OPENAI_MODEL ?? (kind === 'openai-chat' ? 'openrouter/free' : 'gpt-5.6');
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be a valid TCP port');
const timeoutMs = parseGatewayTimeoutMs(process.env.GATEWAY_TIMEOUT_MS);

const provider: GridModelProvider = kind === 'openai-chat'
  ? createOpenAiChatCompletionsProvider({
      apiKey,
      model,
      ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
      requireParameters: process.env.OPENROUTER_REQUIRE_PARAMETERS !== 'false',
      ...(process.env.OPENROUTER_REFERER ? { referer: process.env.OPENROUTER_REFERER } : {}),
      ...(process.env.OPENROUTER_TITLE ? { title: process.env.OPENROUTER_TITLE } : {}),
    })
  : createOpenAiResponsesProvider({
      apiKey,
      model,
      ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
      ...(process.env.OPENAI_ORGANIZATION ? { organization: process.env.OPENAI_ORGANIZATION } : {}),
      ...(process.env.OPENAI_PROJECT ? { project: process.env.OPENAI_PROJECT } : {}),
    });

const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const turnstileHostnames = (process.env.TURNSTILE_HOSTNAMES ?? '')
  .split(',')
  .map((hostname) => hostname.trim())
  .filter((hostname) => hostname.length > 0);
if (turnstileSecret && turnstileHostnames.length === 0) {
  throw new Error('TURNSTILE_HOSTNAMES must list at least one hostname when TURNSTILE_SECRET_KEY is set');
}
const handler = createGridCommandHandler({
  provider,
  timeoutMs,
  ...(turnstileSecret ? {
    authorize: createTurnstileAuthorizer({
      secretKey: turnstileSecret,
      expectedAction: 'grid_command',
      expectedHostnames: turnstileHostnames,
    }),
  } : {}),
  log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
});
const host = process.env.HOST ?? '127.0.0.1';
await listenNodeGateway({ handler, host, port });
process.stdout.write(
  `LibreGrid AI gateway listening on ${host}:${port} using ${provider.service} (${provider.model});`
  + ` provider timeout ${timeoutMs} ms; turnstile ${turnstileSecret ? 'enabled' : 'disabled'}\n`,
);
