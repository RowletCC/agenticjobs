import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentProblem, updateAgent } from '../dist/core/agents.js';

test('concurrent operator updates cannot create a cycle', async () => {
  const agents = new Map([
    ['agent-a', agentRow('agent-a', 'Agent A')],
    ['agent-b', agentRow('agent-b', 'Agent B')],
  ]);
  let lockTail = Promise.resolve();
  let cycleChecks = 0;
  let releaseCycleBarrier!: () => void;
  const cycleBarrier = new Promise<void>((resolve) => {
    releaseCycleBarrier = resolve;
  });

  const acquireOwnerLock = async (): Promise<() => void> => {
    const previous = lockTail;
    let unlock!: () => void;
    const next = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    lockTail = previous.then(() => next);
    await previous;
    return unlock;
  };

  const execute = async (sql: string, values: unknown[] = []) => {
    if (sql.includes('where a.slug = $1')) {
      const row = agents.get(String(values[0]));
      return { rows: row === undefined ? [] : [row] };
    }
    if (sql.includes('select id, owner_id from agents where slug = $1')) {
      const row = agents.get(String(values[0]));
      return { rows: row === undefined ? [] : [{ id: row.id, owner_id: row.owner_id }] };
    }
    if (sql.includes('select operator_id from agents where id = $1')) {
      const row = [...agents.values()].find((agent) => agent.id === values[0]);
      return { rows: row === undefined ? [] : [{ operator_id: row.operator_id }] };
    }
    if (sql.includes('update agents set')) {
      const row = [...agents.values()].find((agent) => agent.id === values[1]);
      assert.ok(row);
      const operatorId = String(values[0]);
      row.operator_id = operatorId;
      row.operator_slug =
        [...agents.values()].find((agent) => agent.id === operatorId)?.slug ?? null;
      row.operator_name =
        [...agents.values()].find((agent) => agent.id === operatorId)?.name ?? null;
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('operator_id = any')) {
      const ids = new Set(values[0] as string[]);
      return {
        rows: [...agents.values()]
          .filter((agent) => agent.operator_id !== null && ids.has(agent.operator_id))
          .map((agent) => ({
            operator_id: agent.operator_id,
            slug: agent.slug,
            name: agent.name,
          })),
      };
    }
    if (sql === 'select id from users where id = $1 for update')
      return { rows: [{ id: values[0] }] };
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] };
    throw new Error(`unexpected query: ${sql}`);
  };

  const pool = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('select operator_id from agents where id = $1')) {
        cycleChecks += 1;
        if (cycleChecks === 2) releaseCycleBarrier();
        await cycleBarrier;
      }
      return execute(sql, values);
    },
    connect: async () => {
      let unlock: (() => void) | undefined;
      return {
        query: async (sql: string, values: unknown[] = []) => {
          if (sql === 'begin') unlock = await acquireOwnerLock();
          const result = await execute(sql, values);
          if (sql === 'commit' || sql === 'rollback') unlock?.();
          return result;
        },
        release: () => unlock?.(),
      };
    },
  };

  const results = await Promise.allSettled([
    updateAgent(pool as never, 'owner-id', 'agent-a', { operator: 'agent-b' }),
    updateAgent(pool as never, 'owner-id', 'agent-b', { operator: 'agent-a' }),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected?.status === 'rejected');
  assert.ok(rejected.reason instanceof AgentProblem);
  assert.equal(rejected.reason.field, 'operator');
  const agentA = agents.get('agent-a');
  const agentB = agents.get('agent-b');
  assert.ok(agentA && agentB);
  assert.notDeepEqual([agentA.operator_id, agentB.operator_id], [agentB.id, agentA.id]);
});

function agentRow(slug: string, name: string) {
  return {
    id: slug,
    owner_id: 'owner-id',
    slug,
    name,
    skills: ['review'],
    description: '',
    url: null,
    operator_id: null as string | null,
    public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    operator_slug: null as string | null,
    operator_name: null as string | null,
    owner_name: 'Owner',
    candidate_slug: null,
  };
}
