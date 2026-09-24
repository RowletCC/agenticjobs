import assert from 'node:assert/strict';
import { test } from 'node:test';
import { htmlToMarkdown } from '../dist/core/browse.js';
import { parseResume } from '../dist/markup/resume.js';

test('HTML resume import retains the address behind an email contact link', () => {
  const markdown = htmlToMarkdown(`
    <main><h1>Ada Lovelace</h1>
      <ul><li><a href="mailto:ada@example.com">Email</a></li></ul>
      <h2>Experience</h2><p>Analytical Engine researcher.</p>
    </main>`);
  assert.match(markdown, /\[Email\]\(mailto:ada@example\.com\)/);
  assert.equal(parseResume(markdown).contact[0]?.href, 'mailto:ada@example.com');
});
