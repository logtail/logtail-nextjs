import { config } from './config';
import { EndpointType } from './shared';

const defaultTimeoutMs = 5000;

export type BetterStackProxyHandlerOptions = {
  // Ingest request timeout in milliseconds.
  timeoutMs?: number;
};

// Route handler alternative to the withBetterStackNextConfig rewrites, which turn any
// upstream failure (e.g. ETIMEDOUT) into a 500 for the client. Always responds 2xx and
// logs delivery failures server-side instead. Mounting instructions: README.
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
