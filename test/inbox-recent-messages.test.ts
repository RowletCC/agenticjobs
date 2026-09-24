import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getThread } from '../dist/core/inbox.js';

test('a long conversation opens with its newest 500 messages in reading order', async () => {
  const messages = Array.from({ length: 501 }, (_, index) => ({
    id: `message-${index + 1}`,
    kind: 'text' as const,
    body: `Message ${index + 1}`,
    invoice_id: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    sender_id: index % 2 === 0 ? 'viewer' : 'other',
  }));
  const participants = [
    { user_id: 'viewer', org_id: null, user_name: 'Ada', email: 'ada@example.test', public_slug: 'ada', org_name: null, org_slug: null },
    { user_id: 'other', org_id: null, user_name: 'Bob', email: 'bob@example.test', public_slug: 'bob', org_name: null, org_slug: null },
  ];
  const pool = {
    async query(sql: string) {
      if (sql.includes('from thread_participants tp')) return { rows: participants };
      if (sql.includes('from threads t left join jobs')) {
        return { rows: [{ id: 'thread', subject: 'Work', created_at: '2026-01-01T00:00:00Z', job_slug: null, job_title: null }] };
      }
      if (sql.includes('from messages where thread_id')) {
        // Model the database's LIMIT after its ORDER BY. The outer query, if
        // present, restores chronological order for display.
        const recent = /order by created_at desc/i.test(sql);
        const selected = recent ? [...messages].reverse().slice(0, 500) : messages.slice(0, 500);
        const restored = /\) recent\s+order by created_at asc/i.test(sql);
        return { rows: restored ? selected.reverse() : selected };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const thread = await getThread(pool as never, 'thread', 'viewer');
  assert.ok(thread);
  assert.equal(thread.messages.length, 500);
  assert.equal(thread.messages[0]?.body, 'Message 2');
  assert.equal(thread.messages.at(-1)?.body, 'Message 501');
});
