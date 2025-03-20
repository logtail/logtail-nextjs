import { config } from '../src/config';
import { EndpointType } from '../src/shared';
import { test, expect, vi } from 'vitest';

vi.hoisted(() => {
  // stub axiom env vars before importing logger
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', '');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
});

test('reads axiom ingest endpoint from envvars', async () => {
  let url = config.getIngestURL(EndpointType.webVitals);
  expect(url).toEqual('https://s123.test.betterstackdata.com');

  url = config.getIngestURL(EndpointType.logs);
  expect(url).toEqual('https://s123.test.betterstackdata.com');
});
