import { test, expect, vi } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { withBetterStack } from '../src/withBetterStack';
import 'whatwg-fetch';

test('withBetterStack(NextConfig)', async () => {
  const config = withBetterStack({
    reactStrictMode: true,
  });
  expect(config).toBeInstanceOf(Object);
});

test('withBetterStack(NextApiHandler)', async () => {
  const handler = withBetterStack((_req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).end();
  });
  expect(handler).toBeInstanceOf(Function);
});

test('withBetterStack(NextMiddleware)', async () => {
  process.env.LAMBDA_TASK_ROOT = 'lol'; // shhh this is AWS Lambda, I promise
  const handler = withBetterStack((_req: NextRequest, _ev: NextFetchEvent) => {
    return NextResponse.next();
  });
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we don't have a NextConfig
});

test('withBetterStack(NextMiddleware)', async () => {
  process.env.LAMBDA_TASK_ROOT = 'lol'; // shhh this is AWS Lambda, I promise
  const handler = withBetterStack((_req: NextRequest, _ev: NextFetchEvent) => {
    return NextResponse.next();
  });
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we don't have a NextConfig
});

test('withBetterStack(NextConfig) with fallback rewrites (regression test for #21)', async () => {
  process.env.BETTER_STACK_INGEST_ENDPOINT = 'http://localhost';

  const rewrites = async () => {
    return {
      fallback: [
        {
          source: '/:bar',
          destination: '/foo/:bar',
        },
      ],
    };
  };

  const config = withBetterStack({
    rewrites: rewrites as any,
  });
  if (config.rewrites) await config.rewrites();
});
