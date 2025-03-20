import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { permanentRedirect } from 'next/navigation';

export const runtime = 'nodejs';

// test handling NEXT_REDIRECT error with status code 308
export const GET = withBetterStack(async (req: BetterStackRequest) => {
    return permanentRedirect('/')
});
