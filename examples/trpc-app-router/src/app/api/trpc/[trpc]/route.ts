import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';
import { withBetterStack } from '@logtail/next';

import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = withBetterStack((req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
            );
          }
        : undefined,
  }),
);

export { handler as GET, handler as POST };
