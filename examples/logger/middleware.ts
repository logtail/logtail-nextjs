import { Logger } from '@logtail/next';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const logger = new Logger({ source: 'middleware' });
  logger.middleware(request);

  event.waitUntil(logger.flush());
  return NextResponse.next();
}

// Reports the requests for pages and API routes, but not those for static files, the logs and
// Web Vitals the browser sends through the proxy path (change _betterstack if you set
// NEXT_PUBLIC_BETTER_STACK_PROXY_PATH), or link prefetches.
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|_betterstack).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
