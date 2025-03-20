import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const runtime = 'edge';

export const POST = withBetterStack(
  (req: BetterStackRequest, { params }: { params: { id: string } }) => {
    req.log.info('dynamic route');
    return new Response(`Hello, Next.js! ${params.id}`);
  },
);
