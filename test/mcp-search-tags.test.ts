import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callTool, type Caller } from '../dist/mcp/tools.js';

test('search_jobs forwards the documented plural tags filter', async () => {
  let requestedPath = '';
  const caller: Caller = {
    server: 'https://board.example.test',
    authenticated: false,
    call: async (_method, path) => {
      requestedPath = path;
      return { status: 200, body: { items: [], total: 0 } };
    },
  };

  await callTool(caller, 'search_jobs', { tags: 'rust,typescript' });
  assert.equal(requestedPath, '/api/v1/jobs?tags=rust%2Ctypescript');
});
