import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listTopics } from '../src/directory/registry.ts';

test('topic totals count a directory instance once when its descriptor repeats a topic', async () => {
  let statement = '';
  const pool = {
    async query(query: string) {
      statement = query;
      return { rows: [{ topic: 'rust', instances: '2' }] };
    },
  };

  const topics = await listTopics(pool as never);

  assert.match(statement, /count\s*\(\s*distinct\s+instances\.id\s*\)/i);
  assert.deepEqual(topics, [{ topic: 'rust', instances: '2' }]);
});
