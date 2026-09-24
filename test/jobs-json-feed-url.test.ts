import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { discoveryRoutes } from '../dist/server/routes/discovery.js';

test('filtered JSON Feed keeps its effective search in feed_url', async () => {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('deps', {
      pool: {
        query: async (sql: string) => ({
          rows: sql.includes('count(*)') ? [{ total: '0' }] : [],
        }),
      },
      config: {
        publicUrl: 'https://board.example',
        boardName: 'Example board',
        boardTagline: 'Example roles',
      },
    });
    await next();
  });
  app.route('/', discoveryRoutes());

  const filtered = await app.request(
    'https://board.example/jobs.json?workplace=remote&tags=typescript&offset=2&limit=1',
  );
  assert.equal(filtered.status, 200);
  assert.equal(
    ((await filtered.json()) as { feed_url: string }).feed_url,
    'https://board.example/jobs.json?workplace=remote&tags=typescript&offset=2',
  );

  const unfiltered = await app.request('https://board.example/jobs.json');
  assert.equal(unfiltered.status, 200);
  assert.equal(
    ((await unfiltered.json()) as { feed_url: string }).feed_url,
    'https://board.example/jobs.json',
  );
});
