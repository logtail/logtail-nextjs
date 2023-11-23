import {
  NextConfig,
  NextApiHandler,
  NextApiResponse,
  NextApiRequest,
  GetServerSideProps,
  GetServerSidePropsContext,
  PreviewData,
  GetServerSidePropsResult,
} from 'next';
import { NextFetchEvent, NextMiddleware, NextRequest } from 'next/server';
import { NextMiddlewareResult } from 'next/dist/server/web/types';
import { ParsedUrlQuery } from 'querystring';
import { Logger, RequestReport } from './logger';
import { Rewrite } from 'next/dist/lib/load-custom-routes';
// import { EndpointType } from './shared';
import config from './config';

declare global {
  var EdgeRuntime: string;
}

function warnAboutMissingEnvironmentVariables() {
  const nodeEnvironment = process.env.NODE_ENV;
  const vercelEnvironment = process.env.VERCEL_ENV;
  let checkEnabled = nodeEnvironment !== 'development' && vercelEnvironment !== 'preview' && vercelEnvironment !== 'development';
  if (process.env.LOGTAIL_CHECK_ENV_VARS?.toLowerCase() === 'true' || process.env.LOGTAIL_CHECK_ENV_VARS === '1') {
    checkEnabled = true;
  }
  if (process.env.LOGTAIL_CHECK_ENV_VARS?.toLowerCase() === 'false' || process.env.LOGTAIL_CHECK_ENV_VARS === '0') {
    checkEnabled = false;
  }

  if (checkEnabled) {
    const log = new Logger();
    log.warn(
      'logtail: Envvars not detected. If this is production please see https://github.com/logtail/logtail-nextjs for help'
    );
    log.warn('logtail: Sending Web Vitals to /dev/null');
    log.warn('logtail: Sending logs to console');
  }
}

export function withLogtailNextConfig(nextConfig: NextConfig): NextConfig {
  return {
    ...nextConfig,
    rewrites: async () => {
      const rewrites = await nextConfig.rewrites?.();

      const proxyEndpoint = config.getProxyEndpoint();
      if (!proxyEndpoint) {
        warnAboutMissingEnvironmentVariables();

        return rewrites || []; // nothing to do
      }

      const logtailRewrites: Rewrite[] = [
        {
          source: config.proxyPath,
          destination: proxyEndpoint,
          basePath: false,
        },
      ];

      if (!rewrites) {
        return logtailRewrites;
      } else if (Array.isArray(rewrites)) {
        return rewrites.concat(logtailRewrites);
      } else {
        rewrites.afterFiles = (rewrites.afterFiles || []).concat(logtailRewrites);
        return rewrites;
      }
    },
  };
}

// Sending logs after res.{json,send,end} is very unreliable.
// This function overwrites these functions and makes sure logs are sent out
// before the response is sent.
function interceptNextApiResponse(req: LogtailAPIRequest, res: NextApiResponse): [NextApiResponse, Promise<void>[]] {
  const allPromises: Promise<void>[] = [];

  const resSend = res.send;
  res.send = (body: any) => {
    allPromises.push(
      (async () => {
        req.log.attachResponseStatus(res.statusCode);
        await req.log.flush();
        resSend(body);
      })()
    );
  };

  const resJson = res.json;
  res.json = (json: any) => {
    allPromises.push(
      (async () => {
        req.log.attachResponseStatus(res.statusCode);
        await req.log.flush();
        resJson(json);
      })()
    );
  };

  const resEnd = res.end;
  res.end = (cb?: () => undefined): NextApiResponse => {
    allPromises.push(
      (async () => {
        req.log.attachResponseStatus(res.statusCode);
        await req.log.flush();
        resEnd(cb);
      })()
    );
    return res;
  };

  return [res, allPromises];
}

export type LogtailAPIRequest = NextApiRequest & { log: Logger };
export type LogtailApiHandler = (
  request: LogtailAPIRequest,
  response: NextApiResponse
) => NextApiHandler | Promise<NextApiHandler> | Promise<void>;

export function withLogtailNextApiHandler(handler: LogtailApiHandler): NextApiHandler {
  return async (req, res) => {
    const report: RequestReport = config.generateRequestMeta(req);
    const logger = new Logger({}, report, false, 'lambda');
    const logtailRequest = req as LogtailAPIRequest;
    logtailRequest.log = logger;
    const [wrappedRes, allPromises] = interceptNextApiResponse(logtailRequest, res);

    try {
      await handler(logtailRequest, wrappedRes);
      await logger.flush();
      await Promise.all(allPromises);
    } catch (error: any) {
      logger.error('Error in API handler', { error });
      logger.attachResponseStatus(500);
      await logger.flush();
      await Promise.all(allPromises);
      throw error;
    }
  };
}

export type LogtailGetServerSidePropsContext<
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData
> = GetServerSidePropsContext<Q, D> & { log: Logger };
export type LogtailGetServerSideProps<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData
> = (context: LogtailGetServerSidePropsContext<Q, D>) => Promise<GetServerSidePropsResult<P>>;

export function withLogtailNextServerSidePropsHandler(handler: LogtailGetServerSideProps): GetServerSideProps {
  return async (context) => {
    const report: RequestReport = config.generateRequestMeta(context.req);
    const logger = new Logger({}, report, false, 'lambda');
    const logtailContext = context as LogtailGetServerSidePropsContext;
    logtailContext.log = logger;

    try {
      const result = await handler(logtailContext);
      await logger.flush();
      return result;
    } catch (error: any) {
      logger.error('Error in getServerSideProps handler', { error });
      logger.attachResponseStatus(500);
      await logger.flush();
      throw error;
    }
  };
}

export type LogtailRequest = NextRequest & { log: Logger };
export type LogtailMiddleware = (
  request: LogtailRequest,
  event: NextFetchEvent
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export function withLogtailNextEdgeFunction(handler: NextMiddleware): NextMiddleware {
  return async (req, ev) => {
    const report: RequestReport = {
      startTime: new Date().getTime(),
      ip: req.ip,
      region: req.geo?.region,
      host: req.nextUrl.host,
      method: req.method,
      path: req.nextUrl.pathname,
      scheme: req.nextUrl.protocol.replace(':', ''),
      userAgent: req.headers.get('user-agent'),
    };

    const logger = new Logger({}, report, false, 'edge');
    const logtailRequest = req as LogtailRequest;
    logtailRequest.log = logger;

    try {
      const res = await handler(logtailRequest, ev);
      if (res) {
        logger.attachResponseStatus(res.status);
      }
      ev.waitUntil(logger.flush());
      logEdgeReport(report);
      return res;
    } catch (error: any) {
      logger.error('Error in edge function', { error });
      logger.attachResponseStatus(500);
      ev.waitUntil(logger.flush());
      logEdgeReport(report);
      throw error;
    }
  };
}

function logEdgeReport(report: any) {
  if (config.shouldSendEdgeReport) {
    console.log(`LOGTAIL_EDGE_REPORT::${JSON.stringify(report)}`);
  }
}

type WithLogtailParam = NextConfig | LogtailApiHandler | NextMiddleware;

function isNextConfig(param: WithLogtailParam): param is NextConfig {
  return typeof param == 'object';
}

function isApiHandler(param: WithLogtailParam): param is LogtailApiHandler {
  const isFunction = typeof param == 'function';

  // Vercel defines EdgeRuntime for edge functions, but Netlify defines NEXT_RUNTIME = 'edge'
  return isFunction && typeof globalThis.EdgeRuntime === 'undefined' && process.env.NEXT_RUNTIME != 'edge';
}

// withLogtail can be called either with NextConfig, which will add proxy rewrites
// to improve deliverability of Web-Vitals and logs, or with NextApiRequest or
// NextMiddleware which will automatically log exceptions and flush logs.
export function withLogtail(param: NextConfig): NextConfig;
export function withLogtail(param: LogtailApiHandler): NextApiHandler;
export function withLogtail(param: NextMiddleware): NextMiddleware;
export function withLogtail(param: WithLogtailParam) {
  if (isNextConfig(param)) {
    return withLogtailNextConfig(param);
  } else if (isApiHandler(param)) {
    return withLogtailNextApiHandler(param);
  } else {
    return withLogtailNextEdgeFunction(param);
  }
}
export const withLogtailGetServerSideProps = withLogtailNextServerSidePropsHandler;
