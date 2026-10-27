import assert from 'node:assert/strict';
import { createMarkdownWorker } from './markdown-negotiation.js';

const originalFetch = globalThis.fetch;
const calls = [];
const pending = [];
const ctx = { waitUntil(promise) { pending.push(promise); } };
const env = {
  MINILYTICS_SITE_API_KEY: 'test-only',
  ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
};
const worker = createMarkdownWorker({});
const request = (ua, url = 'https://flutterreleases.com/releases.json?private=secret', method = 'GET') =>
  new Request(url, { method, headers: { 'User-Agent': ua } });
try {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 202 });
  };
  for (const ua of ['GPTBot/1.0', 'Claude-User/1.0', 'Googlebot/2.1', 'Twitterbot/1.0']) {
    assert.equal(await (await worker.fetch(request(ua), env, ctx)).text(), 'asset');
  }
  await Promise.all(pending.splice(0));
  assert.equal(calls.length, 4);
  assert.equal(calls[0].url, 'https://minilytics.flutterreleases.workers.dev/api/v1/bots');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    url: 'https://flutterreleases.com/releases.json', user_agent: 'GPTBot/1.0',
  });
  await worker.fetch(request('Mozilla/5.0 Chrome/129.0 Safari/537.36'), env, ctx);
  await worker.fetch(request('GPTBot', 'https://preview.pages.dev/'), env, ctx);
  await worker.fetch(request('GPTBot', undefined, 'POST'), env, ctx);
  await worker.fetch(request('GPTBot'), { ...env, MINILYTICS_SITE_API_KEY: '' }, ctx);
  assert.equal(calls.length, 4, 'Humans, previews, writes and missing secrets must not report');
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal((await worker.fetch(request('GPTBot'), env, ctx)).status, 200);
  await Promise.all(pending);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Bot reporting: crawler forwarding, privacy, exclusions and failure isolation passed');
