import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PostJobPage } from '../dist/views/post.js';

test('drafting a job submits the selected employer with the brief', () => {
  const orgs = [
    {
      id: 'o1',
      slug: 'first',
      name: 'First Employer',
      website: null,
      logoUrl: null,
      description: null,
      createdAt: '',
    },
    {
      id: 'o2',
      slug: 'second',
      name: 'Second Employer',
      website: null,
      logoUrl: null,
      description: null,
      createdAt: '',
    },
  ];
  const html = String(
    PostJobPage({
      orgs,
      canDraft: true,
      values: { org: 'second' },
    }),
  );
  const form = /<form[^>]*action="\/post"[^>]*>[\s\S]*?<\/form>/.exec(html)?.[0] ?? '';
  assert.ok(form.includes('name="brief"'), 'the job form carries the brief');
  assert.match(form, /formaction="\/post\/draft"/, 'drafting uses the same submitted form');
  assert.match(form, /formnovalidate/, 'an empty job form can still be drafted');
  assert.match(
    form,
    /name="org"[\s\S]*?value="second" selected/,
    'the chosen employer is submitted',
  );
});
