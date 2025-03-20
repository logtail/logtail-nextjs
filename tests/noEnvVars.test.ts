import { test, expect, vi } from 'vitest';
import { log } from '../src/logger';
import { mockFetchResponse } from './helpers';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL = '';
  process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN = '';
});

vi.useFakeTimers();

test('sending logs on localhost should fallback to console', () => {
  mockFetchResponse('ok');
  const consoleMock = vi.spyOn(console, 'log');

  log.info('hello, world!');
  vi.advanceTimersByTime(1000);
  expect(fetch).toHaveBeenCalledTimes(0);
  expect(consoleMock).toHaveBeenCalledTimes(1);
});
