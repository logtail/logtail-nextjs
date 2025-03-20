import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const runtime = 'nodejs';

export const GET = withBetterStack(async (req: BetterStackRequest) => {
  req.log.info('lambda route');
  return new Response('Hello, Next.js!');
});
