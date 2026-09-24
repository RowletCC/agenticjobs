import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentProblem, registerAgent } from '../dist/core/agents.js';

test('concurrent agent registrations cannot exceed the per-account limit', async () => {
  const startingCount = 99;
  const created = new Map<string, Record<string, unknown>>();
  let lockTail = Promise.resolve();
  let countReaders = 0;
  let releaseCountBarrier!: () => void;
  const countBarrier = new Promise<void>((resolve) => {
    releaseCountBarrier = resolve;
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
    if (sql.includes('select count(*)::int as n from agents')) {
      return { rows: [{ n: startingCount + created.size }] };
    }
    if (sql.includes('select 1 from agents where slug = $1')) return { rows: [] };
    if (sql.includes('insert into agents')) {
      const slug = String(values[1]);
      const row = {
        id: `id-${slug}`,
        owner_id: String(values[0]),
        slug,
        name: String(values[2]),
        skills: values[3] as string[],
        description: String(values[4]),
        url: values[5] as string | null,
        operator_id: values[6] as string | null,
        public: values[7] as boolean,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        operator_slug: null,
        operator_name: null,
        owner_name: 'Owner',
        candidate_slug: null,
      };
      created.set(slug, row);
      return { rows: [{ slug }], rowCount: 1 };
    }
    if (sql.includes('where a.slug = $1')) {
      const row = created.get(String(values[0]));
      if (row !== undefined) return { rows: [row] };
      throw new Error(`unknown agent: ${String(values[0])}`);
    }
    if (sql.includes('operator_id = any')) return { rows: [] };
    if (sql === 'select id from users where id = $1 for update')
      return { rows: [{ id: values[0] }] };
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] };
    throw new Error(`unexpected query: ${sql}`);
  };

  const pool = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('select count(*)::int as n from agents')) {
        countReaders += 1;
        if (countReaders === 2) releaseCountBarrier();
        await countBarrier;
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
    registerAgent(pool as never, 'owner-id', { name: 'Agent One', skills: ['review'] }),
    registerAgent(pool as never, 'owner-id', { name: 'Agent Two', skills: ['review'] }),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected?.status === 'rejected');
  assert.ok(rejected.reason instanceof AgentProblem);
  assert.equal(rejected.reason.status, 409);
  assert.equal(created.size, 1);
});
