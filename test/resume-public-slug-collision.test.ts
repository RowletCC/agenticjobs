import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensurePublicSlug } from '../dist/core/resumes.js';

test('a public resume slug stays within 60 characters after a collision', async () => {
  const candidates: string[] = [];
  const pool = {
    query: async (_sql: string, _values: unknown[]) => {
      const candidate = String(_values[1]);
      candidates.push(candidate);
      return { rows: candidates.length === 1 ? [] : [{ public_slug: candidate }] };
    },
  };
  const resume = {
    id: 'resume-1',
    visibility: 'public',
    publicSlug: null,
    parsed: { name: 'A'.repeat(60) },
    title: 'Long name',
  };

  const slug = await ensurePublicSlug(pool as never, resume as never);

  assert.equal(candidates.length, 2);
  assert.equal(slug, candidates[1]);
  assert.ok((slug ?? '').endsWith('-2'));
  assert.ok((slug ?? '').length <= 60, `collision slug was ${(slug ?? '').length} characters`);
});
