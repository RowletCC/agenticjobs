import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensurePublicSlug } from '../dist/core/resumes.js';

test('a public resume slug stays within 60 characters after a collision', async () => {
  const candidates: string[] = [];
  const pool = {
    query: async (sql: string, _values: unknown[]) => {
      if (sql.startsWith('select public_slug')) return { rows: [] };
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

test('a concurrent public-slug claim retries after the unique index rejects the first candidate', async () => {
  const candidates: string[] = [];
  const pool = {
    query: async (_sql: string, values: unknown[]) => {
      const candidate = String(values[1]);
      candidates.push(candidate);
      if (candidates.length === 1) {
        // Another resume claimed this public name after our NOT EXISTS check.
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
        });
      }
      return { rows: [{ public_slug: candidate }] };
    },
  };
  const resume = {
    id: 'resume-2',
    visibility: 'public',
    publicSlug: null,
    parsed: { name: 'Ada Lovelace' },
    title: 'Long name',
  };

  const slug = await ensurePublicSlug(pool as never, resume as never);

  assert.equal(candidates.length, 2);
  assert.equal(slug, candidates[1]);
  assert.equal(slug, 'ada-lovelace-2');
});

test('a concurrent share of the same resume returns the address already claimed for it', async () => {
  const pool = {
    query: async (sql: string) =>
      sql.startsWith('select public_slug')
        ? { rows: [{ public_slug: 'ada-lovelace' }] }
        : { rows: [] },
  };
  const resume = {
    id: 'resume-3',
    visibility: 'public',
    publicSlug: null,
    parsed: { name: 'Ada Lovelace' },
    title: 'Long name',
  };

  assert.equal(await ensurePublicSlug(pool as never, resume as never), 'ada-lovelace');
});
