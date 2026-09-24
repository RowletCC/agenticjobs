import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { discoveryRoutes } from '../dist/server/routes/discovery.js';

test('pagination and sort parameters do not narrow the whole-site RSS feed', async () => {
  const employer = {
    id: 'org-1',
    slug: 'acme',
    name: 'Acme',
    website: null,
    logo_url: null,
    description: 'Hiring on the board.',
    created_at: '2026-09-20T12:00:00.000Z',
  };
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('from organisations o')) return { rows: [employer] };
      if (sql.includes('count(*)::bigint as total')) return { rows: [{ total: '0' }] };
      return { rows: [] };
    },
  };
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('deps', {
      pool,
      config: {
        boardName: 'Agentic Jobs',
        boardTagline: 'Jobs posted here.',
        publicUrl: 'https://board.example.test',
      },
    } as never);
    await next();
  });
  app.route('/', discoveryRoutes());

  const response = await app.request('/feed.rss?limit=10&offset=20&sort=salary');
  const xml = await response.text();
  assert.equal(response.status, 200);
  assert.match(xml, /<category>Employer<\/category>/);

  const filtered = await app.request('/feed.rss?workplace=remote');
  const filteredXml = await filtered.text();
  assert.ok(!filteredXml.includes('<category>Employer</category>'));
});
