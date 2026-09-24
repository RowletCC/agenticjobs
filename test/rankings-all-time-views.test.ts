import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRankings, topJobs } from '../dist/core/rankings.js';

test('all-time popular ranking includes views older than 400 days', async () => {
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('from job_views')) {
        // This row is older than the rolling 400-day window. PostgreSQL must
        // keep it for the all-time leaderboard to display a true total.
        return {
          rows: sql.includes('v.day >= current_date - 400')
            ? []
            : [{ slug: 'older-job', name: 'Older Job', day: '2025-01-01', views: 3 }],
        };
      }
      if (sql.includes('from applications') || sql.includes('from jobs')) return { rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  };

  const rankings = createRankings(pool as never, {
    boardName: 'Test Board',
    publicUrl: 'https://board.example.test',
  });
  const result = await topJobs(rankings, 'popular', 'all');

  assert.equal(result.total, 1);
  assert.equal(result.rows[0]?.name, 'Older Job');
});
