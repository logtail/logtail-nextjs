// Drives the built examples/logger app for the live legs of .github/workflows/e2e.yml, the way people use it: starts
// it with `next start`, requests its API routes, which log in route handlers on the Node.js and the Edge runtime and
// in the middleware, then opens the home page and the worker page in the machine's Chrome and clicks their buttons,
// which log in the browser and in a web worker. The app sends all of it to Better Stack on its own, and verify-logs
// reads it back afterwards and checks it against e2e/expected.json.
//
// The page's Web Vitals are answered here and never reach Better Stack: how many the browser reports depends on its
// timing, and their rows have no level and message for verify-logs to match. This only checks that the page sent some.
//
// Ends with an ::error:: line and exit code 1 when a route answers with an unexpected status, when the proxy path does
// not accept the browser's logs, when the page throws or sends no Web Vitals, or when the app prints a failed delivery.
// The app has to be built first, with the NEXT_PUBLIC_BETTER_STACK_* variables this runs with.
// Env: NEXT_PUBLIC_BETTER_STACK_INGESTING_URL, NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN, OUT (directory for app.log).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const appDir = fileURLToPath(new URL('../examples/logger/', import.meta.url));
const appUrl = 'http://127.0.0.1:3917';
const out = process.env.OUT || 'out';

// Each one is reported by the middleware and by its route handler, which also logs a line in most of them.
const requests = [
  ['GET', '/api/lambda', 200],
  ['GET', '/api/edge', 200],
  ['POST', '/api/dynamic/42', 200],
  ['GET', '/api/notfound', 404],
  ['GET', '/api/redirect', 307],
  ['GET', '/api/permanentRedirect', 308],
];
// These log the request details and the body, with the password, the Authorization header and the cookie filtered.
const redactRequests = ['/api/redact', '/api/redact-edge'];
// What the home page's buttons log, after the page itself logged "Page loaded".
const buttons = [
  ['Send info', 'Info log from button click'],
  ['Send error', 'Error log from button click'],
  ['Send structured log', 'Complex log with user context'],
  ['Send debug', 'Debug log from button click'],
];

let app;
let appOutput = '';
let browser;

async function startApp() {
  app = spawn(
    process.execPath,
    [join(appDir, 'node_modules/next/dist/bin/next'), 'start', '-p', new URL(appUrl).port],
    {
      cwd: appDir,
    }
  );
  app.stdout.on('data', (data) => (appOutput += data));
  app.stderr.on('data', (data) => (appOutput += data));
  // The app is up once it answers at all, whatever the status: the requests below check that. The favicon is
  // something that neither the middleware nor a route handler logs.
  const ready = () =>
    fetch(`${appUrl}/favicon.ico`)
      .then(() => true)
      .catch(() => false);
  const deadline = Date.now() + 60000;
  while (!(await ready())) {
    if (app.exitCode !== null) throw new Error(`the app exited with code ${app.exitCode}`);
    if (Date.now() > deadline) throw new Error('the app did not answer within 60 s');
    await sleep(250);
  }
}

async function request(method, path, status, init = {}) {
  const response = await fetch(appUrl + path, { method, redirect: 'manual', ...init });
  await response.text();
  console.log(`${method} ${path}: ${response.status}`);
  if (response.status !== status) throw new Error(`${method} ${path} answered ${response.status} instead of ${status}`);
}

// Runs the action and waits until the page's logs that hold the message were posted to the proxy path and accepted.
async function logged(page, message, action) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/_betterstack/logs' &&
        JSON.parse(response.request().postData() || '[]').some((event) => event.message === message),
      { timeout: 15000 }
    ),
    action(),
  ]);
  console.log(`the page sent "${message}", the proxy path answered ${response.status()}`);
  if (!response.ok()) throw new Error(`the proxy path answered ${response.status()} to the logs holding "${message}"`);
}

async function driveBrowser() {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('console', (message) => console.log(`[page ${message.type()}] ${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const webVitals = [];
  await page.route('**/_betterstack/web-vitals', (route) => {
    webVitals.push(...JSON.parse(route.request().postData() || '[]').map((event) => event.webVital?.name));
    return route.fulfill({ status: 202 });
  });

  // The page logs once it is hydrated, so its buttons work from then on.
  await logged(page, 'Page loaded', () => page.goto(appUrl));
  for (const [button, message] of buttons) {
    await logged(page, message, () => page.getByRole('button', { name: button }).click());
  }
  // The worker page starts its worker once it is hydrated. The worker logs two lines and an alert, dismissed on its
  // own, says it is done.
  await Promise.all([page.waitForEvent('worker'), page.goto(`${appUrl}/worker`)]);
  await logged(page, 'fired from worker', () =>
    page.getByRole('button', { name: 'Send Logs from Web Worker' }).click()
  );
  // Leaving a page makes the browser report the Web Vitals it holds back until then.
  await page.goto('about:blank');
  await sleep(2000);

  console.log(`the page sent Web Vitals: ${webVitals.join(', ') || 'none'}`);
  if (pageErrors.length > 0) throw new Error(`the page threw: ${pageErrors.join('; ')}`);
  if (webVitals.length === 0) throw new Error('the page sent no Web Vitals');
}

async function main() {
  await startApp();
  for (const [method, path, status] of requests) await request(method, path, status);
  for (const path of redactRequests) {
    await request('POST', path, 200, {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-secret', Cookie: 'session=abc' },
      body: JSON.stringify({ user: 'ada', password: 'hunter2' }),
    });
  }
  await driveBrowser();
  // The middleware sends its report after the response went out.
  await sleep(5000);
}

let failure;
try {
  await main();
} catch (error) {
  failure = error.message;
}
await browser?.close();
if (app && app.exitCode === null) {
  const exited = new Promise((resolve) => app.once('exit', resolve));
  app.kill();
  await exited;
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'app.log'), appOutput);
console.log(`::group::Example app output\n${appOutput}\n::endgroup::`);
const lines = appOutput.split('\n');
// The client prints what it could not deliver: a network error, or a 5xx or 429 answer after its retries.
const deliveryError = lines.find((line) => /fetch failed| responded with |Failed to proxy/.test(line));
if (!failure && deliveryError) failure = `the app could not deliver logs: ${deliveryError.trim()}`;
// The first error the app printed, such as the exception behind a 500, says why.
const appError = lines.find((line) => /Error/.test(line));
if (failure && appError) failure += `. The app printed: ${appError.trim()}`;
if (failure) {
  console.log(`::error::${failure}`);
  // Not process.exit(): it can cut off output that is still being written to a pipe.
  process.exitCode = 1;
} else {
  console.log('the app served every request, and the browser and the worker logs were accepted');
}
