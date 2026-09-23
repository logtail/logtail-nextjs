import { test, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { Logger } from '../src/logger';
import { withBetterStackRouteHandler } from '../src/withBetterStack';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

const requestBody = '{"name":"widget"}';

const postRequest = () =>
  new NextRequest('http://localhost:3000/api/items?debug=1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'session=abc' },
    body: requestBody,
  });

// Every way the body stream can be touched. On Edge runtimes even clone() tees and locks
// the stream the platform forwards downstream, so middleware must call none of these.
const spyOnBodyAccess = (request: NextRequest) => ({
  clone: vi.spyOn(request, 'clone'),
  json: vi.spyOn(request, 'json'),
  text: vi.spyOn(request, 'text'),
  arrayBuffer: vi.spyOn(request, 'arrayBuffer'),
});

const sentEvents = () => {
  const mockedFetch = fetch as Mock<typeof fetch>;
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  return JSON.parse(mockedFetch.mock.calls[0][1]?.body as string);
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response('', { status: 200 })) as Mock<typeof fetch>;
});

test('middleware with logRequestDetails: true never touches the request body', async () => {
  const logger = new Logger({ source: 'middleware', autoFlush: false });
  const request = postRequest();
  const spies = spyOnBodyAccess(request);

  await logger.middleware(request, { logRequestDetails: true });

  expect(spies.clone).not.toHaveBeenCalled();
  expect(spies.json).not.toHaveBeenCalled();
  expect(spies.text).not.toHaveBeenCalled();
  expect(spies.arrayBuffer).not.toHaveBeenCalled();
  expect(request.bodyUsed).toBe(false);
  expect(await request.text()).toBe(requestBody);

  await logger.flush();
  const [event] = sentEvents();
  expect(event.request.details).not.toHaveProperty('body');
  expect(event.request.details.method).toBe('POST');
  expect(event.request.details.headers['content-type']).toBe('application/json');
  expect(event.request.details.cookies).toEqual({ session: 'abc' });
  expect(event.request.details.nextUrl.searchParams).toEqual({ debug: '1' });
});

test('middleware drops body from a logRequestDetails list', async () => {
  const logger = new Logger({ source: 'middleware', autoFlush: false });
  const request = postRequest();
  const spies = spyOnBodyAccess(request);

  await logger.middleware(request, { logRequestDetails: ['method', 'body', 'url'] });

  expect(spies.clone).not.toHaveBeenCalled();
  expect(spies.json).not.toHaveBeenCalled();
  expect(await request.text()).toBe(requestBody);

  await logger.flush();
  const [event] = sentEvents();
  expect(event.request.details).toEqual({ method: 'POST', url: 'http://localhost:3000/api/items?debug=1' });
});

test('middleware without logRequestDetails never touches the request body', async () => {
  const logger = new Logger({ source: 'middleware', autoFlush: false });
  const request = postRequest();
  const spies = spyOnBodyAccess(request);

  logger.middleware(request);

  expect(spies.clone).not.toHaveBeenCalled();
  expect(await request.text()).toBe(requestBody);
});

test('route handler reads the body only when logRequestDetails asks for it', async () => {
  const handler = withBetterStackRouteHandler(async (req) => new Response(await req.text(), { status: 201 }), {
    logRequestDetails: ['method', 'headers'],
  });
  const request = postRequest();
  const spies = spyOnBodyAccess(request);

  const response = await handler(request, {});

  expect(response.status).toBe(201);
  expect(await response.text()).toBe(requestBody);
  expect(spies.clone).not.toHaveBeenCalled();
  expect(spies.text).toHaveBeenCalledTimes(1); // the handler's own read
  const [event] = sentEvents();
  expect(event.request.details).toEqual({
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'session=abc' },
  });
});

test('route handler with logRequestDetails: true captures the body and leaves it readable', async () => {
  const handler = withBetterStackRouteHandler(async (req) => Response.json(await req.json()), {
    logRequestDetails: true,
  });
  const request = postRequest();

  const response = await handler(request, {});

  expect(await response.json()).toEqual({ name: 'widget' });
  const [event] = sentEvents();
  expect(event.request.details.body).toEqual({ name: 'widget' });
  expect(event.request.details.method).toBe('POST');
});
