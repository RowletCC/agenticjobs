import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listInstances } from '../src/directory/registry.ts';

test('directory name search treats SQL LIKE metacharacters literally', async () => {
  let statement = '';
  let values: unknown[] = [];
  const pool = {
    async query(query: string, params: unknown[] = []) {
      statement = query;
      values = params;
      return { rows: [] };
    },
  };

  await listInstances(pool as never, { q: 'C%_\u005c++' });

  assert.match(statement, /escape/i);
  assert.equal(values[0], '%c\\%\\_\\\\++%');
});
