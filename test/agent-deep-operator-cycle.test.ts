import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentProblem, updateAgent } from '../dist/core/agents.js';

test('operator assignment rejects a cycle deeper than 50 agents', async () => {
  const self = {
    id: 'self',
    owner_id: 'owner',
    slug: 'self',
    name: 'Self',
    skills: ['code'],
    description: '',
    url: null,
    operator_id: null,
    public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    operator_slug: null,
    operator_name: null,
    owner_name: 'Owner',
    candidate_slug: null,
  };
  const pool = {
    query: async (sql: string, values: unknown[]) => {
      if (sql.includes('where a.slug = $1')) return { rows: [self] };
      if (sql.includes('select id, owner_id from agents where slug = $1')) {
        return { rows: [{ id: 'agent-1', owner_id: 'owner' }] };
      }
      if (sql.includes('select operator_id from agents where id = $1')) {
        const depth = Number(String(values[0]).split('-')[1]);
        return { rows: [{ operator_id: depth === 50 ? 'self' : `agent-${depth + 1}` }] };
      }
      if (sql.includes('operator_id = any')) return { rows: [] };
      if (sql.includes('update agents set')) return { rows: [], rowCount: 1 };
      throw new Error(`unexpected query: ${sql}`);
    },
  };

  await assert.rejects(
    updateAgent(pool as never, 'owner', 'self', { operator: 'agent-1' }),
    (error: unknown) => error instanceof AgentProblem && error.field === 'operator',
  );
});
