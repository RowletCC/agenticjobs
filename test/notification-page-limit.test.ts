import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listNotifications, NOTIFICATIONS_KEPT } from '../src/core/watches.ts';

test('the notifications page can list every retained row before marking the page read', async () => {
  let limit: unknown;
  const fake = {
    async query(_text: string, values: unknown[] = []) {
      limit = values[1];
      return { rows: [], rowCount: 0 };
    },
  } as unknown as Parameters<typeof listNotifications>[0];

  await listNotifications(fake, 'user');
  assert.equal(limit, NOTIFICATIONS_KEPT);
});
