import { test, expect, vi, afterEach } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'mytoken');
});

// config.ts detects the runtime when it is first imported, so every case loads a fresh copy.
const loadConfig = async () => {
  vi.resetModules();
  return import('../src/config');
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test('a browser window with a document uses the proxy endpoints', async () => {
  vi.stubGlobal('window', { document: {} });

  const { isBrowser, config } = await loadConfig();

  expect(isBrowser).toBe(true);
  expect(config.getLogsEndpoint()).toBe('/_betterstack/logs');
  expect(config.getWebVitalsEndpoint()).toBe('/_betterstack/web-vitals');
});

test('a Deno-style global window without a document is a server runtime', async () => {
  // Deno 1.x (Netlify Edge Functions) exposes `window` as an alias of globalThis, without a DOM.
  vi.stubGlobal('window', globalThis);

  const { isBrowser, config } = await loadConfig();

  expect(isBrowser).toBe(false);
  expect(config.getLogsEndpoint()).toBe('https://s123.test.betterstackdata.com');
  expect(config.getWebVitalsEndpoint()).toBe('https://s123.test.betterstackdata.com');
});

test('a server runtime without window sends straight to the ingesting URL', async () => {
  const { isBrowser, config } = await loadConfig();

  expect(isBrowser).toBe(false);
  expect(config.getLogsEndpoint()).toBe('https://s123.test.betterstackdata.com');
});

test('a web worker uses the proxy endpoints', async () => {
  class WorkerGlobalScope {}
  vi.stubGlobal('WorkerGlobalScope', WorkerGlobalScope);
  vi.stubGlobal('self', new WorkerGlobalScope());

  const { isBrowser, config } = await loadConfig();

  expect(isBrowser).toBe(true);
  expect(config.getLogsEndpoint()).toBe('/_betterstack/logs');
});
