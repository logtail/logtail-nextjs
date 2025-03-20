import { test, expect, vi } from 'vitest';
import { config } from '../src/config';
import { EndpointType } from '../src/shared';
import { Logger } from '../src/logger';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL = 'https://s123.test.betterstackdata.com';
  process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN = 'mytoken';
});

test('reading vercel ingest endpoint', () => {
  let url = config.getIngestURL(EndpointType.webVitals);
  expect(url).toEqual('https://s123.test.betterstackdata.com');

  url = config.getIngestURL(EndpointType.logs);
  expect(url).toEqual('https://s123.test.betterstackdata.com');
});

test('logging to Axiom when running on lambda', async () => {
  vi.useFakeTimers();
  const mockedConsole = vi.spyOn(console, 'log');
  global.fetch = vi.fn(async () => {
    const resp = new Response('', { status: 200 });
    return Promise.resolve(resp);
  });

  const logger = new Logger({
    source: 'lambda-log',
  });

  logger.info('hello, world!');

  await logger.flush();
  expect(mockedConsole).toHaveBeenCalledTimes(0);
  expect(fetch).toHaveBeenCalledTimes(1);
});
