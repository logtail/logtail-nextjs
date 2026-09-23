import { test, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { Logger } from '../src/logger';
import { withBetterStackRouteHandler } from '../src/withBetterStack';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

// Every event sent so far, across all fetch calls.
const sentEvents = () =>
  (fetch as Mock<typeof fetch>).mock.calls.flatMap(([, init]) => JSON.parse(init?.body as string));

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response('', { status: 202 })) as Mock<typeof fetch>;
});

test('replaces values of matching keys anywhere in the fields', async () => {
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, redact: ['password', /^x-api-/i] });

  logger.info('signup', {
    user: { name: 'ada', password: 'hunter2', UserPassword: 'hunter3' },
    headers: [{ 'X-Api-Key': 'k1' }, { 'x-api-secret': 'k2' }],
    token: 'stays',
  });
  await logger.flush();

  expect(sentEvents()[0].fields).toEqual({
    user: { name: 'ada', password: '[FILTERED]', UserPassword: '[FILTERED]' },
    headers: [{ 'X-Api-Key': '[FILTERED]' }, { 'x-api-secret': '[FILTERED]' }],
    token: 'stays',
  });
});

test('redacts nothing by default', async () => {
  const logger = new Logger({ source: 'lambda-log', autoFlush: false });

  logger.info('signup', { password: 'hunter2' });
  await logger.flush();

  expect(sentEvents()[0].fields).toEqual({ password: 'hunter2' });
});

test('child loggers inherit the redaction and apply it to their bound fields', async () => {
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, redact: ['secret'] });

  logger.with({ clientSecret: 's3cr3t', clientId: 'id' }).info('hello', { other: 1 });
  await logger.flush();

  expect(sentEvents()[0].fields).toEqual({ clientSecret: '[FILTERED]', clientId: 'id', other: 1 });
});

test('redacts request details captured by middleware', async () => {
  const logger = new Logger({ source: 'middleware', autoFlush: false, redact: ['authorization', 'cookie', 'session'] });
  const request = new NextRequest('http://localhost:3000/api/items', {
    method: 'GET',
    headers: { authorization: 'Bearer token', cookie: 'session=abc; theme=dark', 'user-agent': 'vitest' },
  });

  await logger.middleware(request, { logRequestDetails: true });
  await logger.flush();

  const { details } = sentEvents()[0].request;
  expect(details.headers).toEqual({ authorization: '[FILTERED]', cookie: '[FILTERED]', 'user-agent': 'vitest' });
  expect(details.cookies).toEqual({ session: '[FILTERED]', theme: 'dark' });
});

test('route handler redacts the request details and the logs written inside the handler', async () => {
  const handler = withBetterStackRouteHandler(
    async (req) => {
      req.log.info('creating user', { password: 'hunter2', name: 'ada' });
      return new Response('ok');
    },
    { logRequestDetails: true, redact: ['password', 'authorization'] }
  );
  const request = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
    body: '{"name":"ada","password":"hunter2"}',
  });

  await handler(request, {});

  const events = sentEvents();
  const httpEvent = events.find((event) => event.message.startsWith('POST /api/users'));
  const userEvent = events.find((event) => event.message === 'creating user');
  expect(httpEvent.request.details.headers.authorization).toBe('[FILTERED]');
  expect(httpEvent.request.details.body).toEqual({ name: 'ada', password: '[FILTERED]' });
  expect(userEvent.fields).toEqual({ password: '[FILTERED]', name: 'ada' });
  expect(userEvent.request.details.body).toEqual({ name: 'ada', password: '[FILTERED]' });
});
