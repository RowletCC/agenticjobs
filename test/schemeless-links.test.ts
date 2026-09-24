import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateApplication } from '../dist/core/applications.js';
import { updateOrg } from '../dist/core/orgs.js';

const pasted = 'example.com/blog?next=https://docs.example/guide';
const expected = `https://${pasted}`;

test('an application accepts a schemeless URL with a nested URL parameter', () => {
  const result = validateApplication(
    { fields: [{ name: 'portfolio', label: 'Portfolio', type: 'url', required: true }] },
    { portfolio: pasted },
    'welcome',
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.answers.portfolio, expected);
});

test('an employer website retains a nested URL parameter when edited', async () => {
  const existing = {
    id: 'org-1', slug: 'example', name: 'Example', website: null, logo_url: null,
    description: null, created_at: '2026-01-01T00:00:00Z',
  };
  let written: unknown[] | undefined;
  const pool = {
    async query(_sql: string, values: unknown[]) {
      if (values.length === 1) return { rows: [existing] };
      written = values;
      return { rows: [{ ...existing, website: values[2] }] };
    },
  };
  const result = await updateOrg(pool as never, 'example', { website: pasted });
  assert.equal(written?.[2], expected);
  assert.equal(typeof result === 'string' ? result : result.website, expected);
});
