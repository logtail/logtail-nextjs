![next-axiom: The official Next.js library for Axiom](.github/images/banner-dark.svg#gh-dark-mode-only)
![next-axiom: The official Next.js library for Axiom](.github/images/banner-light.svg#gh-light-mode-only)

<div align="center">

[![build](https://img.shields.io/github/actions/workflow/status/axiomhq/next-axiom/ci.yml?branch=main&ghcache=unused)](https://github.com/axiomhq/next-axiom/actions?query=workflow%3ACI)
[![Latest release](https://img.shields.io/github/release/axiomhq/next-axiom.svg)](https://github.com/axiomhq/next-axiom/releases/latest)
[![License](https://img.shields.io/github/license/axiomhq/next-axiom.svg?color=blue)](https://opensource.org/licenses/MIT)

</div>

[Axiom](https://axiom.co) unlocks observability at any scale.

- **Ingest with ease, store without limits:** Axiom’s next-generation datastore enables ingesting petabytes of data with ultimate efficiency. Ship logs from Kubernetes, AWS, Azure, Google Cloud, DigitalOcean, Nomad, and others.
- **Query everything, all the time:** Whether DevOps, SecOps, or EverythingOps, query all your data no matter its age. No provisioning, no moving data from cold/archive to “hot”, and no worrying about slow queries. All your data, all. the. time.
- **Powerful dashboards, for continuous observability:** Build dashboards to collect related queries and present information that’s quick and easy to digest for you and your team. Dashboards can be kept private or shared with others, and are the perfect way to bring together data from different sources.

For more information, check out the [official documentation](https://axiom.co/docs).

## Introduction

This library allows you to send Web Vitals as well as structured logs from your Next.js application to Axiom.

## Installation

> **Note**
> Using the Pages Router? Use version `0.*`, which will continue to get security patches. Here's the [README for `0.x`](https://github.com/axiomhq/next-axiom/blob/v0.x/README.md). 

In your Next.js project, install next-axiom:

```sh
npm install --save next-axiom
```

In the `next.config.ts` file, wrap your Next.js config in `withAxiom` as follows:

```js
const { withAxiom } = require('next-axiom');

module.exports = withAxiom({
  // ... your existing config
});
```

If you are using the [Vercel integration](https://www.axiom.co/vercel),
no further configuration is required.

Otherwise create a dataset and an API token in [Axiom settings](https://cloud.axiom.co/settings/profile), then export them as environment variables `NEXT_PUBLIC_AXIOM_DATASET` and `NEXT_PUBLIC_AXIOM_TOKEN`.


## Capture traffic requests

Create a `middleware.ts` in the root dir of your app:

```typescript
import { Logger } from 'next-axiom'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

const logger = new Logger({
  source: 'traffic'
});

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest, event: NextFetchEvent) {
    const req = {
        ip: request.ip,
        region: request.geo?.region,
        method: request.method,
        host: request.nextUrl.host,
        path: request.nextUrl.pathname,
        scheme: request.nextUrl.protocol.split(":")[0],
        referer: request.headers.get('Referer'),
        userAgent: request.headers.get('user-agent'),
        statusCode: 0,
    }


    const message = `[${request.method}] [middleware: "middleware"] ${request.nextUrl.pathname}`

    logger.logHttpRequest(message, req, {})
    event.waitUntil(logger.flush())

    return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
}
```

### Web Vitals

Go to `app/layout.tsx` and add the Web Vitals component:

```tsx
import { AxiomWebVitals } from 'next-axiom';

export default function RootLayout() {
  return (
    <html>
      ...
      <AxiomWebVitals />
      <div>...</div>
    </html>
  );
}
```

> **Note**: WebVitals are only sent from production deployments.

### Logs

Send logs to Axiom from different parts of your application. Each log function call takes a message and an optional fields object.

```typescript
log.debug('Login attempt', { user: 'j_doe', status: 'success' }); // results in {"message": "Login attempt", "fields": {"user": "j_doe", "status": "success"}}
log.info('Payment completed', { userID: '123', amount: '25USD' });
log.warn('API rate limit exceeded', { endpoint: '/users/1', rateLimitRemaining: 0 });
log.error('System Error', { code: '500', message: 'Internal server error' });
```

#### Route Handlers

Wrapping your Route Handlers in `withAxiom` will add a logger to your
request and automatically log exceptions:

```typescript
import { withAxiom, AxiomRequest } from 'next-axiom';

export const GET = withAxiom((req: AxiomRequest) => {
  req.log.info('Login function called');

  // You can create intermediate loggers
  const log = req.log.with({ scope: 'user' });
  log.info('User logged in', { userId: 42 });

  return NextResponse.json({ hello: 'world' });
});
```

#### Client Components

For Client Components, you can add a logger to your component with `useLogger`:

```tsx
'use client';
import { useLogger } from 'next-axiom';

export default function ClientComponent() {
  const log = useLogger();
  log.debug('User logged in', { userId: 42 });
  return <h1>Logged in</h1>;
}
```

#### Server Components

For Server Components, create a logger and make sure to call flush before returning:

```tsx
import { Logger } from 'next-axiom';

export default async function ServerComponent() {
  const log = new Logger();
  log.info('User logged in', { userId: 42 });

  // ...

  await log.flush();
  return <h1>Logged in</h1>;
}
```

#### Log Levels

The log level defines the lowest level of logs sent to Axiom.
The default is debug, resulting in all logs being sent.
Available levels are (from lowest to highest): `debug`, `info`, `warn`, `error`

For example, if you don't want debug logs to be sent to Axiom:

```sh
export NEXT_PUBLIC_AXIOM_LOG_LEVEL=info
```

You can also disable logging completely by setting the log level to `off`.


### Capturing Errors

To capture routing errors we can use the [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling) mechanism of Next. 

Create a new file named `error.ts` under your `/app` directory. Inside your component function use the logger to ingest the error to Axiom. e.g:

```typescript
"use client";

import NavTable from "@/components/NavTable";
import { useLogger } from "next-axiom";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const log = useLogger();
  log.error(error.message, {
    error: error.name,
    cause: error.cause,
    stack: error.stack,
    digest: error.digest,
  });

  return <div className="p-8">
    Ops! An Error has occurred: <p className="text-red-400 px-8 py-2 text-lg">`{ error.message }`</p>
    
    <div className="w-1/3 mt-8">
        <NavTable />
    </div>
    
    </div>;
}
```

## Upgrade to the App Router

next-axiom switched to support the App Router starting with version 1.0. If you are upgrading a Pages Router app with next-axiom v0.x to the App Router, you will need to make the following changes:

- Upgrade next-axiom to version 1.0.0 or higher
- Make sure that exported variables has `NEXT_PUBLIC_` prefix, e.g: `NEXT_PUBLIC_AXIOM_TOKEN`
- Use `useLogger` hook in client components instead of `log` prop
- For server side components, you will need to create an instance of `Logger` and flush the logs before component returns.
- For web-vitals, remove `reportWebVitals()` and instead add the `AxiomWebVitals` component to your layout.

## FAQ

### How can I send logs from Vercel preview deployments?

The Axiom Vercel integration sets up an environment variable called `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT`, which by default is only enabled for the production environment. To send logs from preview deployments, go to your site settings in Vercel and enable preview deployments for that environment variable.

### How can I extend the logger?

You can use `log.with` to create an intermediate logger, for example:

```typescript
const logger = userLogger().with({ userId: 42 });
logger.info('Hi'); // will ingest { ..., "message": "Hi", "fields" { "userId": 42 }}
```

## License

Distributed under the [MIT License](LICENSE).
