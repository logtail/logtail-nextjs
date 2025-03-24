import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const runtime = 'edge';

export const GET = withBetterStack(async (req: BetterStackRequest) => {
  req.log.info('fired from edge route');
  return new Response('Hello, Next.js!');
});
