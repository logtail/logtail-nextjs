import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

// test handling NEXT_REDIRECT error
export const GET = withBetterStack(async (req: BetterStackRequest) => {
  return redirect('/');
});
