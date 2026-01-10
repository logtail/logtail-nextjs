import { NextConfig } from 'next';
import { Rewrite } from 'next/dist/lib/load-custom-routes';
import { config, isEdgeRuntime, isVercel } from './config';
import { LogLevel, Logger, RequestReport } from './logger';
import { type NextRequest, type NextResponse } from 'next/server';
import { EndpointType, RequestJSON, requestToJSON } from './shared';

export function withBetterStackNextConfig(nextConfig: NextConfig): NextConfig {
  return {
    ...nextConfig,
    rewrites: async () => {
      const rewrites = await nextConfig.rewrites?.();

      const webVitalsEndpoint = config.getIngestURL(EndpointType.webVitals);
      const logsEndpoint = config.getIngestURL(EndpointType.logs);
      if (!webVitalsEndpoint && !logsEndpoint) {
        const log = new Logger();
        log.warn(
          'Envvars not detected. If this is production please see https://betterstack.com/docs/logs/javascript/nextjs/ for help'
        );
        log.warn('Sending Web Vitals to /dev/null');
        log.warn('Sending logs to console');
        return rewrites || []; // nothing to do
      }

      const betterStackRewrites: Rewrite[] = [
        {
          source: `${config.proxyPath}/web-vitals`,
          destination: webVitalsEndpoint,
          basePath: false,
        },
        {
          source: `${config.proxyPath}/logs`,
          destination: logsEndpoint,
          basePath: false,
        },
      ];

      if (!rewrites) {
        return betterStackRewrites;
      } else if (Array.isArray(rewrites)) {
        return rewrites.concat(betterStackRewrites);
      } else {
        rewrites.afterFiles = (rewrites.afterFiles || []).concat(betterStackRewrites);
        return rewrites;
      }
    },
  };
}

export type BetterStackRequest = NextRequest & {
  log: Logger;
  nextUrl?: { hostname: string; pathname: string; protocol: string };
};
type NextHandler<T = any> = (
  req: BetterStackRequest,
  arg?: T
) => Promise<Response> | Promise<NextResponse> | NextResponse | Response;

type RouteHandler = (request: NextRequest, context: any) => any;

type BetterStackRouteHandlerConfig = {
  logRequestDetails?: boolean | (keyof RequestJSON)[];
  // override default log levels for notFound and redirect
  notFoundLogLevel?: LogLevel; // defaults to LogLevel.warn
  redirectLogLevel?: LogLevel; // defaults to LogLevel.info
};

export function withBetterStackRouteHandler(
  handler: NextHandler,
  config?: BetterStackRouteHandlerConfig
): RouteHandler {
  return async (request: NextRequest, context: any) => {
    const pathname = request.nextUrl.pathname;

    const requestDetails =
      Array.isArray(config?.logRequestDetails) || config?.logRequestDetails === true
        ? await requestToJSON(request)
        : undefined;

    const report: RequestReport = {
      startTime: new Date().getTime(),
      endTime: new Date().getTime(),
      path: pathname,
      method: request.method,
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      scheme: request.url.split('://')[0],
      ip: request.headers.get('x-forwarded-for'),
      details: Array.isArray(config?.logRequestDetails)
        ? (Object.fromEntries(
            Object.entries(requestDetails as RequestJSON).filter(([key]) =>
              (config?.logRequestDetails as (keyof RequestJSON)[]).includes(key as keyof RequestJSON)
            )
          ) as RequestJSON)
        : requestDetails,
    };

    // main logger, mainly used to log reporting on the incoming HTTP request
    const logger = new Logger({ req: report, source: isEdgeRuntime ? 'edge' : 'lambda' });
    // child logger to be used by the users within the handler
    const log = logger.with({});
    log.config.source = `${isEdgeRuntime ? 'edge' : 'lambda'}-log`;
    const betterStackContext = request as any as BetterStackRequest;
    betterStackContext.log = log;

    // Handle params Promise for Next.js 15+
    const resolvedParams =
      context && typeof context === 'object' && 'params' in context && context.params instanceof Promise
        ? { ...context, params: await context.params }
        : context;

    try {
      const result = await handler(betterStackContext, resolvedParams);
      report.endTime = new Date().getTime();

      // report log record
      report.statusCode = result.status;
      report.durationMs = report.endTime - report.startTime;
      // record the request
      if (!isVercel) {
        logger.logHttpRequest(
          LogLevel.info,
          `${request.method} ${report.path} ${report.statusCode} in ${report.endTime - report.startTime}ms`,
          report,
          {}
        );
      }

      // attach the response status to all children logs
      log.attachResponseStatus(result.status);

      // flush the logger along with the child logger
      await logger.flush();
      return result;
    } catch (error: any) {
      // capture request endTime first for more accurate reporting
      report.endTime = new Date().getTime();
      // set default values for statusCode and logLevel
      let statusCode = 500;
      let logLevel = LogLevel.error;
      // handle navigation errors like notFound and redirect
      if (error instanceof Error) {
        if (error.message === 'NEXT_NOT_FOUND') {
          logLevel = config?.notFoundLogLevel ?? LogLevel.warn;
          statusCode = 404;
        } else if (error.message === 'NEXT_REDIRECT') {
          logLevel = config?.redirectLogLevel ?? LogLevel.info;
          // according to Next.js docs, values are: 307 (Temporary) or 308 (Permanent)
          // see: https://nextjs.org/docs/app/api-reference/functions/redirect#why-does-redirect-use-307-and-308
          // extract status code from digest, if exists
          const e: Error & { digest?: string } = error;
          if (e.digest) {
            const d = e.digest.split(';');
            statusCode = parseInt(d[3]);
          } else {
            statusCode = 307;
          }
        }
      }

      // report log record
      report.statusCode = statusCode;
      report.durationMs = report.endTime - report.startTime;

      // record the request
      if (!isVercel) {
        logger.logHttpRequest(
          logLevel,
          `${request.method} ${report.path} ${report.statusCode} in ${report.endTime - report.startTime}ms`,
          report,
          {}
        );
      }

      // forward the error message as a log event
      log.log(logLevel, error.message, { error });
      log.attachResponseStatus(statusCode);

      await logger.flush();
      throw error;
    }
  };
}

// withBetterStack can be called either with NextConfig, which will add proxy rewrites
// to improve deliverability of Web-Vitals and logs, or with a NextHandler function.
export function withBetterStack(param: any, config?: BetterStackRouteHandlerConfig): any {
  if (typeof param === 'function') {
    return withBetterStackRouteHandler(param, config);
  } else {
    // Assume it's a NextConfig object if it's not a function
    return withBetterStackNextConfig(param as NextConfig);
  }
}
