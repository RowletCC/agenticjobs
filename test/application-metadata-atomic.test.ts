import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../dist/core/applications.js';

test('application ownership and resume snapshot are saved with the application', async () => {
  const userId = '00000000-0000-4000-8000-000000000001';
  const jobId = '00000000-0000-4000-8000-000000000002';
  const markdown = '# Ada Lovelace\n\nEngineer';
  let calls = 0;
  let statement = '';
  let values: unknown[] = [];
  const pool = {
    query: async (query: string, parameters: unknown[]) => {
      calls += 1;
      statement = query;
      values = parameters;
      return {
        rows: [
          {
            id: '00000000-0000-4000-8000-000000000003',
            job_id: jobId,
            answers: { name: 'Ada' },
            agent: null,
            status: 'draft',
            created_at: '2026-09-24T00:00:00.000Z',
            submitted_at: null,
          },
        ],
      };
    },
  };

  await createApplication(
    pool as never,
    jobId,
    { answers: { name: 'Ada' }, agent: null },
    {
      submit: false,
      userId,
      resumeMarkdown: markdown,
      resumeTitle: 'Ada Lovelace',
    },
  );

  assert.equal(calls, 1, 'the application and its candidate-only metadata use one insert');
  assert.match(statement, /user_id[\s\S]*resume_markdown[\s\S]*resume_title/i);
  assert.ok(values.includes(userId));
  assert.ok(values.includes(markdown));
  assert.ok(values.includes('Ada Lovelace'));
});
