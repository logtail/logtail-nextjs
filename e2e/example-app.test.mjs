// End-to-end check of the library as an app consumes it. A local HTTP receiver stands in for the
// Better Stack ingesting endpoint, the built examples/logger app runs under `next start`, and the
// tests assert on the log events the receiver got for the requests made here.
//
// The app has to be built first, with the same NEXT_PUBLIC_BETTER_STACK_* variables that this
// file runs with. See .github/workflows/e2e.yml for the whole sequence.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const appDir = process.env.E2E_APP_DIR || fileURLToPath(new URL('../examples/logger/', import.meta.url));
const ingestingUrl = new URL(process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL);
const sourceToken = process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN;
const appUrl = 'http://127.0.0.1:3917';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const requests = [
  ['GET', '/api/lambda'],
  ['GET', '/api/edge'],
  ['POST', '/api/dynamic/42'],
  ['GET', '/api/notfound'],
  ['GET', '/api/redirect'],
  ['GET', '/api/permanentRedirect'],
];
const browserEvent = { level: 'info', message: 'sent by the browser', source: 'frontend-log' };

// One entry per HTTP request the receiver got
const deliveries = [];
const responses = {};
let receiver,
  app,
  appOutput = '';

const waitFor = async (description, condition, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}\n${appOutput}`);
    await sleep(100);
  }
};

// Events sent by the library itself, as opposed to what the browser posts through the proxy path
const libraryDeliveries = () => deliveries.filter(({ headers }) => headers['user-agent']?.startsWith('next-logtail/'));
const events = (source, path) =>
  libraryDeliveries()
    .flatMap((delivery) => delivery.events)
    .filter((event) => event.source === source && event.request?.path === path);

before(
  async () => {
    receiver = http.createServer((request, response) => {
      const chunks = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        const events = JSON.parse(Buffer.concat(chunks).toString());
        deliveries.push({ method: request.method, headers: request.headers, events });
        response.writeHead(202).end();
      });
    });
    await new Promise((resolve) => receiver.listen(Number(ingestingUrl.port), ingestingUrl.hostname, resolve));

    app = spawn(
      process.execPath,
      [join(appDir, 'node_modules/next/dist/bin/next'), 'start', '-p', new URL(appUrl).port],
      {
        cwd: appDir,
      }
    );
    app.stdout.on('data', (data) => (appOutput += data));
    app.stderr.on('data', (data) => (appOutput += data));
    await waitFor(
      'the app to start',
      () =>
        fetch(appUrl).then(
          (response) => response.ok,
          () => false
        ),
      60000
    );
    await sleep(500);
    deliveries.length = 0; // drop what the readiness probes logged

    for (const [method, path] of requests) {
      const response = await fetch(appUrl + path, { method, redirect: 'manual' });
      responses[path] = { status: response.status, body: await response.text() };
    }
    const proxied = await fetch(`${appUrl}/_betterstack/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sourceToken}` },
      body: JSON.stringify([browserEvent]),
    });
    responses['/_betterstack/logs'] = { status: proxied.status };

    // Every request is reported by the middleware, which flushes after the response went out
    await waitFor(
      'the logs of every request',
      () => [...requests, ['POST', '/_betterstack/logs']].every(([, path]) => events('middleware', path).length > 0),
      15000
    ).catch(() => {}); // the tests below say what exactly is missing
  },
  { timeout: 120000 }
);

after(() => {
  app?.kill();
  receiver?.close();
  console.log(`::group::Example app output\n${appOutput}\n::endgroup::`);
});

test('a Node.js route handler reports the request and the logs written in it', () => {
  assert.deepEqual(responses['/api/lambda'], { status: 200, body: 'Hello, Next.js!' });

  const [report] = events('lambda', '/api/lambda');
  assert.equal(report.level, 'info');
  assert.match(report.message, /^GET \/api\/lambda 200 in \d+ms$/);
  assert.equal(report.request.statusCode, 200);

  const [log] = events('lambda-log', '/api/lambda');
  assert.equal(log.message, 'lambda route');
  assert.equal(log.request.statusCode, 200);
});

test('an Edge route handler reports the request and the logs written in it', () => {
  assert.deepEqual(responses['/api/edge'], { status: 200, body: 'Hello, Next.js!' });

  const [report] = events('edge', '/api/edge');
  assert.match(report.message, /^GET \/api\/edge 200 in \d+ms$/);

  const [log] = events('edge-log', '/api/edge');
  assert.equal(log.message, 'fired from edge route');
});

test('a wrapped route handler still gets its route params', () => {
  assert.deepEqual(responses['/api/dynamic/42'], { status: 200, body: 'Hello, Next.js! 42' });

  const [log] = events('edge-log', '/api/dynamic/42');
  assert.equal(log.message, 'dynamic route');
  assert.equal(log.request.method, 'POST');
});

test('notFound() is reported as a 404 warning', () => {
  assert.equal(responses['/api/notfound'].status, 404);

  const [report] = events('lambda', '/api/notfound');
  assert.equal(report.level, 'warn');
  assert.equal(report.request.statusCode, 404);
});

test('redirect() and permanentRedirect() are reported with their status', () => {
  assert.equal(responses['/api/redirect'].status, 307);
  assert.equal(responses['/api/permanentRedirect'].status, 308);

  const [temporary] = events('lambda', '/api/redirect');
  assert.equal(temporary.level, 'info');
  assert.equal(temporary.request.statusCode, 307);

  const [permanent] = events('lambda', '/api/permanentRedirect');
  assert.equal(permanent.level, 'info');
  assert.equal(permanent.request.statusCode, 308);
});

test('the middleware reports every request', () => {
  for (const [method, path] of requests) {
    const [report] = events('middleware', path);
    assert.ok(report, `no middleware report for ${method} ${path}`);
    assert.equal(report.message, `${method} ${path}`);
    assert.equal(report.request.method, method);
  }
});

test('what the browser posts to the proxy path reaches the ingesting endpoint', () => {
  assert.equal(responses['/_betterstack/logs'].status, 202);

  const proxied = deliveries.filter(({ events }) => events[0]?.message === browserEvent.message);
  assert.equal(proxied.length, 1);
  assert.deepEqual(proxied[0].events, [browserEvent]);
  assert.equal(proxied[0].headers.authorization, `Bearer ${sourceToken}`);
});

test('every delivery is an authorized JSON POST that identifies the library', () => {
  assert.ok(libraryDeliveries().length > 0);
  for (const { method, headers, events } of libraryDeliveries()) {
    assert.equal(method, 'POST');
    assert.equal(headers.authorization, `Bearer ${sourceToken}`);
    assert.equal(headers['content-type'], 'application/json');
    assert.equal(headers['user-agent'], `next-logtail/v${version}`);
    for (const event of events) {
      assert.equal(event['@app']['next-logtail-version'], version);
      assert.equal(event.platform.environment, 'production');
      assert.ok(!Number.isNaN(Date.parse(event.dt)), `unparsable dt ${event.dt}`);
    }
  }
});
