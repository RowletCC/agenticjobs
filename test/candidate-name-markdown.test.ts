import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCandidateSummary } from '../dist/core/candidates.js';
import { parseResume } from '../dist/markup/resume.js';

test('candidate directory names omit Markdown emphasis markers from the h1', () => {
  const markdown = '# **Ada Lovelace**\n';
  const candidate = toCandidateSummary({
    id: 'r', userId: 'u', slug: 'ada', title: 'Ada Lovelace', markdown,
    parsed: parseResume(markdown), visibility: 'public', publicSlug: 'ada',
    sourceName: null, createdAt: '', updatedAt: '',
  });

  assert.equal(candidate.name, 'Ada Lovelace');
});
