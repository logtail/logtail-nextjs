# [Better Stack](https://betterstack.com/logs) Next.js client

📣 Logtail is now part of Better Stack. [Learn more ⇗](https://betterstack.com/press/introducing-better-stack/)

[![Better Stack dashboard](https://github.com/logtail/logtail-python/assets/10132717/e2a1196b-7924-4abc-9b85-055e17b5d499)](https://betterstack.com/logs)

[![MIT License](https://img.shields.io/badge/license-MIT-ff69b4.svg)](https://github.com/logtail/logtail-nextjs/blob/master/LICENSE.md)
[![npm @logtail/next](https://img.shields.io/npm/v/@logtail/next?color=success&label=npm%20%40logtail%2Fnext)](https://www.npmjs.com/package/@logtail/next)
[![CI](https://github.com/logtail/logtail-nextjs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/logtail/logtail-nextjs/actions/workflows/ci.yml)

Experience SQL-compatible structured log management based on ClickHouse. [Learn more ⇗](https://logtail.com/)

## Documentation

- [Running on Vercel ⇗](https://betterstack.com/docs/logs/vercel/)
- [Running elsewhere  ⇗](https://betterstack.com/docs/logs/javascript/nextjs/)

## Keeping telemetry failures out of your app

By default, `withBetterStack(nextConfig)` proxies browser telemetry to Better Stack with a Next.js rewrite. If the ingest endpoint is ever slow or unreachable, Next.js turns the failed rewrite into a `500` on your own domain and the error shows up in the browser console.

To make telemetry delivery failures invisible to the browser, serve the proxy path with the provided route handler instead. It forwards with a 5-second timeout and always responds `204`, logging delivery failures on the server only. Pick a proxy path that can host a route handler (the default `/_betterstack` can't — `_`-prefixed folders are private in the app router):

```bash
# .env
NEXT_PUBLIC_BETTER_STACK_PROXY_PATH=/betterstack
```

```ts
// app/betterstack/web-vitals/route.ts, and the same in app/betterstack/logs/route.ts
export { POST } from '@logtail/next/proxy';
```

Static route files take precedence over the rewrite, so nothing else changes. Use one file per endpoint — a `[...path]` catch-all would be shadowed by the rewrite, which Next.js checks before dynamic routes. To customize the timeout:

```ts
import { createBetterStackProxyHandler } from '@logtail/next';

export const POST = createBetterStackProxyHandler({ timeoutMs: 10000 });
```

## Need help?
Please let us know at [hello@betterstack.com](mailto:hello@betterstack.com). We're happy to help!

---

[MIT license](https://github.com/logtail/logtail-nextjs/blob/master/LICENSE.md)
