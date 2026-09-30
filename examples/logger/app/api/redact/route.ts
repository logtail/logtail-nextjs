import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const runtime = 'nodejs';

// Logs the request details and the fields below with the listed keys filtered out
export const POST = withBetterStack(
  async (req: BetterStackRequest) => {
    const body = await req.json();
    req.log.info('redact route', { user: body.user, password: body.password });
    return Response.json({ user: body.user });
  },
  { logRequestDetails: true, redact: ['password', 'authorization', 'cookie'] },
);
