import { runGatewayConformance } from './conformance';

const endpoint = process.argv[2] ?? process.env.LIBREGRID_AI_ENDPOINT ?? 'http://127.0.0.1:8787/v1/grid-command';
const report = await runGatewayConformance({
  endpoint,
  ...(process.env.LIBREGRID_AI_AUTHORIZATION ? { authorization: process.env.LIBREGRID_AI_AUTHORIZATION } : {}),
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
