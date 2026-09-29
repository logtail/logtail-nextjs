import { test, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { Logger } from '../src/logger';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

// fetch that fails `failures` times (by throwing or by returning what `failure` gives) and then accepts.
const flakyFetch = (failures: number, failure: () => Response) => {
  let calls = 0;
  return vi.fn(async () => {
    calls++;
    if (calls <= failures) {
      return failure();
    }
    return new Response('', { status: 202 });
  }) as Mock<typeof fetch>;
};

const networkError = () => {
  throw new TypeError('fetch failed');
};

const sentBodies = () => (fetch as Mock<typeof fetch>).mock.calls.map(([, init]) => init?.body as string);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('resends the same batch when the network request fails', async () => {
  global.fetch = flakyFetch(2, networkError);
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, retryBackoff: 1 });

  logger.info('hello, world!');
  await logger.flush();

  expect(fetch).toHaveBeenCalledTimes(3);
  expect(new Set(sentBodies()).size).toBe(1);
  expect(JSON.parse(sentBodies()[0])[0].message).toBe('hello, world!');
  expect(console.error).not.toHaveBeenCalled();
});

test('retries 5xx and 429 responses', async () => {
  let calls = 0;
  global.fetch = vi.fn(async () => {
    calls++;
    return new Response('', { status: [503, 429, 202][calls - 1] });
  }) as Mock<typeof fetch>;
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, retryBackoff: 1 });

  logger.info('hello, world!');
  await logger.flush();

  expect(fetch).toHaveBeenCalledTimes(3);
  expect(console.error).not.toHaveBeenCalled();
});

test('does not retry client errors', async () => {
  global.fetch = vi.fn(async () => new Response('', { status: 401 })) as Mock<typeof fetch>;
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, retryBackoff: 1 });

  logger.info('hello, world!');
  await logger.flush();

  expect(fetch).toHaveBeenCalledTimes(1);
});

test('gives up after retryCount retries and reports the failure once', async () => {
  global.fetch = flakyFetch(10, networkError);
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, retryCount: 2, retryBackoff: 1 });

  logger.info('hello, world!');
  await logger.flush();

  expect(fetch).toHaveBeenCalledTimes(3);
  expect(console.error).toHaveBeenCalledTimes(1);
});

test('retries 3 times with a 100 ms backoff by default', async () => {
  vi.useFakeTimers();
  global.fetch = flakyFetch(10, networkError);
  const logger = new Logger({ source: 'lambda-log', autoFlush: false });

  logger.info('hello, world!');
  const flushed = logger.flush();

  await vi.advanceTimersByTimeAsync(0);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(99);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(100);
  expect(fetch).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(100);
  expect(fetch).toHaveBeenCalledTimes(4);
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetch).toHaveBeenCalledTimes(4);
  await flushed;
});

test('child loggers inherit the retry settings', async () => {
  global.fetch = flakyFetch(1, networkError);
  const logger = new Logger({ source: 'lambda-log', autoFlush: false, retryCount: 1, retryBackoff: 1 });

  logger.with({ foo: 'bar' }).info('hello, world!');
  await logger.flush();

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(console.error).not.toHaveBeenCalled();
});
