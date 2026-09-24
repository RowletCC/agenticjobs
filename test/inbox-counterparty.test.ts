import assert from 'node:assert/strict';
import { test } from 'node:test';
import { counterpartyFrom } from '../src/core/inbox.ts';

test('a message target must not silently prefer a candidate when an employer is also supplied', async () => {
  const calls: string[] = [];
  const fake = {
    async query(text: string) {
      calls.push(text);
      if (text.includes('from resumes')) return { rows: [{ user_id: 'candidate-user' }] };
      if (text.includes('from organisations')) return { rows: [{ id: 'employer-id' }] };
      throw new Error(`unexpected query: ${text}`);
    },
  } as unknown as Parameters<typeof counterpartyFrom>[0];

  const target = await counterpartyFrom(fake, { candidate: 'ada', employer: 'acme' });
  assert.equal(target, null);
  assert.deepEqual(calls, []);
});
