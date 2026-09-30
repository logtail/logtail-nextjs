import vm from 'node:vm';
import { test, expect, vi, beforeEach, Mock } from 'vitest';
import { Logger, LogLevel, redact } from '../src/logger';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

// On the Edge runtime a parsed request body comes from another realm than the library's code,
// so its prototype is not the Object.prototype the library sees.
const fromAnotherRealm = (source: string) => vm.runInNewContext(`(${source})`);

const sentEvents = () =>
  (fetch as Mock<typeof fetch>).mock.calls.flatMap(([, init]) => JSON.parse(init?.body as string));

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response('', { status: 202 })) as Mock<typeof fetch>;
});

test('redacts a plain object from another realm', () => {
  const body = fromAnotherRealm('{ user: "ada", password: "hunter2", nested: [{ password: "inner" }] }');

  expect(redact(body, ['password'])).toEqual({
    user: 'ada',
    password: '[FILTERED]',
    nested: [{ password: '[FILTERED]' }],
  });
});

test('redacts a request body from another realm inside the request details', async () => {
  const logger = new Logger({ source: 'edge', autoFlush: false, redact: ['password'] });
  const body = fromAnotherRealm('{ user: "ada", password: "hunter2" }');

  logger.logHttpRequest(LogLevel.info, 'POST /api/users', { path: '/api/users', details: { body } }, {});
  await logger.flush();

  expect(sentEvents()[0].request.details.body).toEqual({ user: 'ada', password: '[FILTERED]' });
});

test('leaves values that are not plain objects alone, whatever realm they come from', () => {
  const date = new Date(0);
  const foreignDate = fromAnotherRealm('new Date(0)');

  expect(redact({ password: 'hunter2', date, foreignDate }, ['password'])).toEqual({
    password: '[FILTERED]',
    date,
    foreignDate,
  });
});
