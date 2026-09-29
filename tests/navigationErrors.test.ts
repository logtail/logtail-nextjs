import { test, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { LogLevel } from '../src/logger';
import { withBetterStackRouteHandler } from '../src/withBetterStack';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

const request = () => new NextRequest('http://localhost:3000/api/items');

// The report of the HTTP request itself, as opposed to the logs written inside the handler.
const httpReport = () =>
  (fetch as Mock<typeof fetch>).mock.calls
    .flatMap(([, init]) => JSON.parse(init?.body as string))
    .find((event) => event.source === 'lambda');

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response('', { status: 202 })) as Mock<typeof fetch>;
});

test('notFound() is reported as a 404 warning', async () => {
  const handler = withBetterStackRouteHandler(async () => notFound());

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('warn');
  expect(httpReport().request.statusCode).toBe(404);
  expect(httpReport().message).toMatch(/^GET \/api\/items 404 in \d+ms$/);
});

test('notFoundLogLevel sets the level of a notFound() report', async () => {
  const handler = withBetterStackRouteHandler(async () => notFound(), { notFoundLogLevel: LogLevel.info });

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('info');
  expect(httpReport().request.statusCode).toBe(404);
});

test('an error thrown as NEXT_NOT_FOUND, as Next.js 15.0 did, is reported as a 404 warning', async () => {
  const handler = withBetterStackRouteHandler(async () => {
    throw new Error('NEXT_NOT_FOUND');
  });

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('warn');
  expect(httpReport().request.statusCode).toBe(404);
});

test('forbidden() and unauthorized() style errors keep their own status', async () => {
  const handler = withBetterStackRouteHandler(async () => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;403'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;403' });
  });

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('warn');
  expect(httpReport().request.statusCode).toBe(403);
});

test('redirect() is reported as a 307', async () => {
  const handler = withBetterStackRouteHandler(async () => redirect('/'));

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('info');
  expect(httpReport().request.statusCode).toBe(307);
});

test('permanentRedirect() is reported as a 308', async () => {
  const handler = withBetterStackRouteHandler(async () => permanentRedirect('/'));

  await expect(handler(request(), {})).rejects.toThrow();

  expect(httpReport().level).toBe('info');
  expect(httpReport().request.statusCode).toBe(308);
});

test('any other error is reported as a 500 error', async () => {
  const handler = withBetterStackRouteHandler(async () => {
    throw new Error('boom');
  });

  await expect(handler(request(), {})).rejects.toThrow('boom');

  expect(httpReport().level).toBe('error');
  expect(httpReport().request.statusCode).toBe(500);
});
