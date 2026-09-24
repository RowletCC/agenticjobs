import assert from 'node:assert/strict';
import { test } from 'node:test';
import { updateOrg } from '../src/core/orgs.ts';

test('independent concurrent employer patches keep both field changes', async () => {
  const org = {
    id: 'org-1',
    slug: 'example-works',
    name: 'Example Works',
    website: 'https://old.example/',
    logo_url: 'https://old.example/logo.png',
    description: 'Original description',
    created_at: '2026-09-24T00:00:00.000Z',
  };
  let reads = 0;
  let releaseReads: (() => void) | undefined;
  const bothReads = new Promise<void>((resolve) => {
    releaseReads = resolve;
  });

  const pool = {
    async query(sql: string, params: unknown[] = []) {
      if (sql.startsWith('select id, slug')) {
        const snapshot = { ...org };
        reads += 1;
        if (reads === 2) releaseReads?.();
        await bothReads;
        return { rows: [snapshot], rowCount: 1 };
      }

      assert.match(sql, /^update organisations set /);
      const assignments = sql.match(/^update organisations set (.+) where id = \$1/s)?.[1];
      assert.ok(assignments);
      for (const [, column, parameter] of assignments.matchAll(
        /(name|website|description|logo_url) = \$(\d+)/g,
      )) {
        org[column as keyof typeof org] = params[Number(parameter) - 1] as never;
      }
      return { rows: [{ ...org }], rowCount: 1 };
    },
  };

  const results = await Promise.all([
    updateOrg(pool as never, org.slug, { website: 'new.example' }),
    updateOrg(pool as never, org.slug, { logoUrl: 'new.example/logo.png' }),
  ]);

  assert.ok(results.every((result) => typeof result !== 'string'));
  assert.equal(org.website, 'https://new.example/');
  assert.equal(org.logo_url, 'https://new.example/logo.png');
});
