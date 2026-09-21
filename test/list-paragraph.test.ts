import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../dist/markup/markdown.js';

test('list items retain complete paragraphs around a code block', () => {
  assert.equal(
    renderMarkdown('- Introduction\n  ```text\n  literal\n  ```\n  Conclusion'),
    '<ul><li><p>Introduction</p>\n<pre><code class="language-text">literal\n</code></pre>\n<p>Conclusion</p></li></ul>',
  );
});

test('ordered list items retain complete paragraphs around a quote', () => {
  assert.equal(
    renderMarkdown('1. Introduction\n  > Quoted text\n  Conclusion'),
    '<ol><li><p>Introduction</p>\n<blockquote><p>Quoted text</p></blockquote>\n<p>Conclusion</p></li></ol>',
  );
});

test('list items retain complete paragraphs around a nested list', () => {
  assert.equal(
    renderMarkdown('- Introduction\n  - Nested item\n  Conclusion'),
    '<ul><li><p>Introduction</p>\n<ul><li>Nested item</li></ul>\n<p>Conclusion</p></li></ul>',
  );
});

test('a single paragraph continuation stays compact', () => {
  assert.equal(
    renderMarkdown('- First line\n  Second line\n- Next item'),
    '<ul><li>First line<br />Second line</li><li>Next item</li></ul>',
  );
});

test('paragraphs preceding a final code block remain paired', () => {
  assert.equal(
    renderMarkdown('- Introduction\n  ```\n  literal\n  ```'),
    '<ul><li><p>Introduction</p>\n<pre><code>literal\n</code></pre></li></ul>',
  );
});
