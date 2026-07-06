import { test, expect, vi } from 'vitest';
import { config } from '../src/config';
import { withBetterStackNextConfig } from '../src/withBetterStack';
import { Rewrite } from 'next/dist/lib/load-custom-routes';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_PROXY_PATH', '/betterstack');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', 'https://s123.test.betterstackdata.com');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', 'server-token');
});

test('NEXT_PUBLIC_BETTER_STACK_PROXY_PATH overrides the proxy path used by rewrites', async () => {
  expect(config.proxyPath).toBe('/betterstack');

  const nextConfig = withBetterStackNextConfig({});
  const rewrites = (await nextConfig.rewrites?.()) as Rewrite[];
  const sources = rewrites.map((rewrite) => rewrite.source);
  expect(sources).toContain('/betterstack/web-vitals');
  expect(sources).toContain('/betterstack/logs');
});
