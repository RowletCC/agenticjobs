import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentProblem, updateAgent } from '../dist/core/agents.js';

test('updating an agent with an invalid URL preserves its existing URL', async () => {
  const agent = {
    id: 'agent-id',
    owner_id: 'owner-id',
    slug: 'reviewer',
    name: 'Reviewer',
    skills: ['review'],
    description: '',
    url: 'https://reviewer.example/',
    operator_id: null,
    public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    operator_slug: null,
    operator_name: null,
    owner_name: 'Owner',
    candidate_slug: null,
  };
  let writes = 0;
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('where a.slug = $1')) return { rows: [agent] };
      if (sql.includes('operator_id = any')) return { rows: [] };
      if (sql.includes('update agents set')) {
        writes += 1;
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };

  await assert.rejects(
    updateAgent(pool as never, 'owner-id', 'reviewer', { url: 'ftp://reviewer.example/' }),
    (error: unknown) => error instanceof AgentProblem && error.field === 'url',
  );
  assert.equal(writes, 0);
});
