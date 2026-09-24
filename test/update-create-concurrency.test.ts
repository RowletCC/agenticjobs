import assert from 'node:assert/strict';
import { test } from 'node:test';
import { postUpdate } from '../src/core/updates.ts';

test('concurrent duplicate update posts are serialized per author', async () => {
  const inserted: { id: string; body: string }[] = [];
  let lockQueue: Promise<void> = Promise.resolve();
  const query = async (sql: string, params: unknown[] = [], unlock?: () => void) => {
    if (sql === 'begin') return { rows: [], rowCount: null };
    if (sql.startsWith('select pg_advisory_xact_lock')) return { rows: [], rowCount: 1 };
    if (sql === 'commit' || sql === 'rollback') {
      unlock?.();
      return { rows: [], rowCount: null };
    }
    if (sql.includes('count(*) filter')) {
      return {
        rows: [
          { today: inserted.length, same: inserted.filter((row) => row.body === params[1]).length },
        ],
        rowCount: 1,
      };
    }
    if (sql.includes('insert into updates')) {
      const row = { id: `update-${inserted.length + 1}`, body: String(params[2]) };
      inserted.push(row);
      return {
        rows: [
          {
            ...row,
            link: params[3] as string | null,
            created_at: '2026-09-24T00:00:00.000Z',
            org_id: null,
            org_slug: null,
            org_name: null,
            user_id: String(params[0]),
            user_name: null,
            public_slug: 'author',
            resume_name: 'Author',
            resume_title: null,
          },
        ],
        rowCount: 1,
      };
    }
    throw new Error(`unexpected query: ${sql}`);
  };

  const pool = {
    query,
    async connect() {
      let unlock: (() => void) | undefined;
      return {
        query: async (sql: string, params: unknown[] = []) => {
          if (sql.startsWith('select pg_advisory_xact_lock')) {
            const previous = lockQueue;
            let release!: () => void;
            lockQueue = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            unlock = release;
          }
          return query(sql, params, unlock);
        },
        release() {
          unlock?.();
        },
      };
    },
  };

  const results = await Promise.all([
    postUpdate(
      pool as never,
      'author-1',
      { kind: 'candidate', userId: 'author-1' },
      {
        body: 'We shipped the new editor today.',
      },
    ),
    postUpdate(
      pool as never,
      'author-1',
      { kind: 'candidate', userId: 'author-1' },
      {
        body: 'We shipped the new editor today.',
      },
    ),
  ]);

  assert.equal(inserted.length, 1);
  assert.equal(results.filter((result) => typeof result === 'string').length, 1);
  assert.equal(results.filter((result) => typeof result !== 'string').length, 1);
});
