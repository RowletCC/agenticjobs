import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoardClient } from '../dist/client/client.js';

test('search treats explicitly undefined optional filters as omitted', async () => {
  let requested = '';
  const client = new BoardClient('https://board.test', {
    fetch: async (input) => {
      requested = String(input);
      return Response.json({ items: [], total: 0, limit: 25, offset: 0, query: {} });
    },
  });

  await client.search({ q: 'typescript', tags: undefined });

  assert.equal(requested, 'https://board.test/api/v1/jobs?q=typescript');
});
