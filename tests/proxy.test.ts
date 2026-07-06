import { test, expect, vi, beforeEach } from 'vitest';
import { createBetterStackProxyHandler } from '../src/proxy';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'server-token');
});

const webVitalsRequest = (body: string = '[{"webVital":{"name":"LCP"}}]') =>
  new Request('http://localhost:3000/_betterstack/web-vitals', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer client-token' },
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test('forwards the payload to the ingest endpoint and responds 204', async () => {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
  const handler = createBetterStackProxyHandler();

  const response = await handler(webVitalsRequest());

  expect(response.status).toBe(204);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://s123.test.betterstackdata.com');
  expect(init?.method).toBe('POST');
  expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('[{"webVital":{"name":"LCP"}}]');
  const headers = init?.headers as Record<string, string>;
  expect(headers['Authorization']).toBe('Bearer client-token');
  expect(headers['Content-Type']).toBe('application/json');
});

test('falls back to the configured token when the request has no Authorization header', async () => {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
  const handler = createBetterStackProxyHandler();

  const request = new Request('http://localhost:3000/_betterstack/web-vitals', {
    method: 'POST',
    body: '[]',
    headers: { 'Content-Type': 'application/json' },
  });
  const response = await handler(request);

  expect(response.status).toBe(204);
  const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
  expect(headers['Authorization']).toBe('Bearer server-token');
});

test('proxies /_betterstack/logs as well', async () => {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
  const handler = createBetterStackProxyHandler();

  const request = new Request('http://localhost:3000/_betterstack/logs', {
    method: 'POST',
    body: '[]',
    headers: { 'Content-Type': 'application/json' },
  });
  const response = await handler(request);

  expect(response.status).toBe(204);
  expect(fetchMock.mock.calls[0][0]).toBe('https://s123.test.betterstackdata.com');
});

test('responds 204 when the ingest endpoint is unreachable', async () => {
  const timeoutError = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
  vi.spyOn(global, 'fetch').mockRejectedValue(timeoutError);
  const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const handler = createBetterStackProxyHandler();

  const response = await handler(webVitalsRequest());

  expect(response.status).toBe(204);
  expect(warnMock).toHaveBeenCalledTimes(1);
});

test('responds 204 when the ingest endpoint answers with an error status', async () => {
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response('service unavailable', { status: 503 }));
  const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const handler = createBetterStackProxyHandler();

  const response = await handler(webVitalsRequest());

  expect(response.status).toBe(204);
  expect(warnMock).toHaveBeenCalledTimes(1);
});

test('aborts and responds 204 when the ingest endpoint hangs beyond the timeout', async () => {
  vi.spyOn(global, 'fetch').mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })
  );
  const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const handler = createBetterStackProxyHandler({ timeoutMs: 20 });

  const response = await handler(webVitalsRequest());

  expect(response.status).toBe(204);
  expect(warnMock).toHaveBeenCalledTimes(1);
});

test('responds 404 for unknown proxy paths without forwarding', async () => {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
  const handler = createBetterStackProxyHandler();

  const request = new Request('http://localhost:3000/_betterstack/unknown', { method: 'POST', body: '[]' });
  const response = await handler(request);

  expect(response.status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});
