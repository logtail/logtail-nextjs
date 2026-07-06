import { test, expect, vi } from 'vitest';
import { createBetterStackProxyHandler } from '../src/proxy';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_INGESTING_URL', '');
  vi.stubEnv('BETTER_STACK_INGESTING_URL', '');
  vi.stubEnv('NEXT_PUBLIC_LOGTAIL_URL', '');
  vi.stubEnv('LOGTAIL_URL', '');
  vi.stubEnv('NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN', '');
});

test('responds 204 without forwarding when the ingest endpoint is not configured', async () => {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
  const handler = createBetterStackProxyHandler();

  const request = new Request('http://localhost:3000/_betterstack/web-vitals', { method: 'POST', body: '[]' });
  const response = await handler(request);

  expect(response.status).toBe(204);
  expect(fetchMock).not.toHaveBeenCalled();
});
