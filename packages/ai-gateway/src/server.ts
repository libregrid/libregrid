import { createGridCommandHandler } from './gateway';
import { listenNodeGateway } from './nodeServer';
import { createOpenAiResponsesProvider } from './openAiResponsesProvider';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? 'gpt-5.6';
if (!apiKey) throw new Error('OPENAI_API_KEY is required');
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be a valid TCP port');

const provider = createOpenAiResponsesProvider({
  apiKey,
  model,
  ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
  ...(process.env.OPENAI_ORGANIZATION ? { organization: process.env.OPENAI_ORGANIZATION } : {}),
  ...(process.env.OPENAI_PROJECT ? { project: process.env.OPENAI_PROJECT } : {}),
});
const handler = createGridCommandHandler({
  provider,
  log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
});
await listenNodeGateway({ handler, host: process.env.HOST ?? '127.0.0.1', port });
process.stdout.write(`LibreGrid AI gateway listening on ${process.env.HOST ?? '127.0.0.1'}:${port}\n`);
