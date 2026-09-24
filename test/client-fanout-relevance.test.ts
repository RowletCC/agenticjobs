import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchEverywhere } from '../dist/client/fanout.js';

function page(slugs: string[]) {
  const items = slugs.map((slug, index) => ({
    slug,
    publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));
  return { items, total: items.length };
}

test('a single board retains its older best match', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(page(['best', 'newer'])));
  const result = await searchEverywhere([{ server: 'https://board.test', token: null }], {
    q: 'typescript',
    sort: 'relevant',
    limit: 2,
  });
  assert.deepEqual(
    result.jobs.map((hit) => hit.job.slug),
    ['best', 'newer'],
  );
});

test('fanout preserves relevance ranking and interleaves boards before pagination', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === 'first.test') await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json(
      url.hostname === 'first.test'
        ? page(['first-best', 'first-next'])
        : page(['second-best', 'second-next']),
    );
  });

  const result = await searchEverywhere(
    [
      { server: 'https://first.test', token: null },
      { server: 'https://second.test', token: null },
    ],
    { q: 'typescript', sort: 'relevant', limit: 2, offset: 0 },
  );

  assert.deepEqual(
    result.jobs.map((hit) => hit.job.slug),
    ['first-best', 'second-best'],
  );
});

test('relevance pagination crosses interleaved board ranks', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = new URL(String(input));
    return Response.json(
      url.hostname === 'first.test'
        ? page(['first-best', 'first-next'])
        : page(['second-best', 'second-next']),
    );
  });

  const result = await searchEverywhere(
    [
      { server: 'https://first.test', token: null },
      { server: 'https://second.test', token: null },
    ],
    { q: 'typescript', sort: 'relevant', limit: 2, offset: 2 },
  );

  assert.deepEqual(
    result.jobs.map((hit) => hit.job.slug),
    ['first-next', 'second-next'],
  );
});

test('relevant without a nonblank query keeps recent ordering', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(page(['older', 'newer'])));

  for (const q of [null, undefined, '', '   ']) {
    const result = await searchEverywhere([{ server: 'https://board.test', token: null }], {
      q,
      sort: 'relevant',
      limit: 2,
    });
    assert.deepEqual(
      result.jobs.map((hit) => hit.job.slug),
      ['newer', 'older'],
    );
  }
});
