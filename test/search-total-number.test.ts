import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchJobs } from '../dist/core/jobs.js';
import { EMPTY_QUERY } from '../dist/schema/query.js';

test('job search returns a numeric total from a PostgreSQL bigint count', async () => {
  const pool = {
    query: async (sql: string) =>
      sql.includes('count(*)::bigint') ? { rows: [{ total: '7' }] } : { rows: [] },
  };

  const page = await searchJobs(pool as never, EMPTY_QUERY);

  assert.equal(page.total, 7);
});
