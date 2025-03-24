import { initTRPC } from '@trpc/server';
import { type NextRequest } from 'next/server';
import { type BetterStackRequest, Logger } from '@logtail/next';
import { type createTRPCContext } from './trpc';

export type NextBetterStackTRPCMiddlewareCtx = {
  /**
   * We are passing the entire req object. This means:
   * - we have access to it in the procedure
   * - because it's typed as NextRequest, the logger will be visible to TS at `ctx.log` but not on `ctx.res`
   */
  req: NextRequest;
  /**
   * Anything you want to stick on all logs that are sent throughout the duration of the current procedure
   * This is currently not optional, but can pass an empty object.
   */
  betterStackTRPCMeta: Record<string, unknown>;
};

function isBetterStackRequest(req: unknown): req is BetterStackRequest {
  return (req as NextRequest & { log: Logger }).log instanceof Logger;
}

export function createBetterStackPlugin() {
  const t = initTRPC
    .context<typeof createTRPCContext>()
    // Add meta if required
    // .meta<{}>()
    .create();

  return {
    betterStackProcedure: t.procedure.use((opts) => {
      const req = opts.ctx.req;

      if (!isBetterStackRequest(req)) {
        throw new Error(
          '`nextBetterStackTRPCMiddleware` could not find logger. Did you forget to wrap your route handler in `withBetterStack`? See: TODO: link to docs',
        );
      }

      const log = req.log.with({ betterStackTRPCMeta: opts.ctx.betterStackTRPCMeta });

      return opts.next({
        ctx: { log },
      });
    }),
  };
}
