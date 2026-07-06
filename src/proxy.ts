import { config } from './config';
import { EndpointType } from './shared';

const defaultTimeoutMs = 5000;

export type BetterStackProxyHandlerOptions = {
  // How long to wait for the ingest endpoint before giving up, in milliseconds.
  timeoutMs?: number;
};

// The rewrites added by withBetterStackNextConfig let Next.js proxy browser telemetry
// to the ingest endpoint, but Next.js surfaces any upstream failure (e.g. ETIMEDOUT)
// as a 500 to the client. Mounting this handler in the app router takes precedence
// over the rewrite and always responds 2xx, so an unreachable ingest endpoint never
// shows up as a failed request in the app.
//
// The default proxy path can't host a route handler ("_betterstack" is a private
// folder, excluded from routing), so pick a routable one via the env var:
//
//   # .env
//   NEXT_PUBLIC_BETTER_STACK_PROXY_PATH=/betterstack
//
//   // app/betterstack/web-vitals/route.ts, and the same in app/betterstack/logs/route.ts
//   export { POST } from '@logtail/next/proxy';
//
// Static route files are required — Next.js checks "afterFiles" rewrites before
// dynamic routes, so a [...path] catch-all would be shadowed by the rewrite.
export function createBetterStackProxyHandler(options: BetterStackProxyHandlerOptions = {}) {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

  return async function handleProxiedIngest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const endpointType = pathname.endsWith(`/${EndpointType.webVitals}`)
      ? EndpointType.webVitals
      : pathname.endsWith(`/${EndpointType.logs}`)
      ? EndpointType.logs
      : undefined;

    if (!endpointType) {
      return new Response(null, { status: 404 });
    }

    const ingestURL = config.getIngestURL(endpointType);
    if (!ingestURL) {
      // Same as the client behavior without env vars: send to /dev/null.
      return new Response(null, { status: 204 });
    }

    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    };
    const authorization = request.headers.get('authorization') || (config.token ? `Bearer ${config.token}` : null);
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    const userAgent = request.headers.get('user-agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    try {
      const response = await fetch(ingestURL, {
        method: 'POST',
        body: await request.arrayBuffer(),
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        console.warn(`Failed to send telemetry to Better Stack: ${ingestURL} responded with ${response.status}`);
      }
    } catch (error) {
      // Telemetry delivery must never break the app — log and pretend success.
      console.warn(`Failed to send telemetry to Better Stack: ${ingestURL} is unreachable`, error);
    }

    return new Response(null, { status: 204 });
  };
}

export const POST = createBetterStackProxyHandler();
