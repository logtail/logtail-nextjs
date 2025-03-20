import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';

// test handling NEXT_NOT_FOUND error
export const GET = withBetterStack(async (req: BetterStackRequest) => {
  return notFound();
});
