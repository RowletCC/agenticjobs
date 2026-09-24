import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationPage, countApplications, listApplications } from '../dist/core/applications.js';

test('application inbox pages use a stable order and honor their offset', async () => {
  let sql = '';
  let params: unknown[] = [];
  const pool = {
    query: async (statement: string, values: unknown[]) => {
      sql = statement;
      params = values;
      return { rows: [] };
    },
  };

  await listApplications(pool as never, 'job-1', 25, 50);

  assert.match(sql, /order by created_at desc, id desc\s+limit \$2 offset \$3/i);
  assert.deepEqual(params, ['job-1', 25, 50]);
});

test('application inbox page controls are bounded and malformed values use defaults', () => {
  assert.deepEqual(applicationPage(new URLSearchParams('limit=20&offset=40')), {
    limit: 20,
    offset: 40,
  });
  assert.deepEqual(applicationPage(new URLSearchParams('limit=0&offset=-8')), {
    limit: 1,
    offset: 0,
  });
  assert.deepEqual(applicationPage(new URLSearchParams('limit=10000&offset=abc')), {
    limit: 100,
    offset: 0,
  });
  assert.deepEqual(applicationPage(new URLSearchParams('limit=%2020%20&offset=40')), {
    limit: 20,
    offset: 40,
  });
});

test('application inbox counts all submitted rows as a number', async () => {
  let sql = '';
  const pool = {
    query: async (statement: string) => {
      sql = statement;
      return { rows: [{ total: '101' }] };
    },
  };

  assert.equal(await countApplications(pool as never, 'job-1'), 101);
  assert.match(sql, /count\(\*\)::bigint/i);
  assert.match(sql, /submitted_at is not null/i);
});
