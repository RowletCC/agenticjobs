import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../dist/markup/markdown.js';

test('headings accept up to three leading spaces after a paragraph', () => {
  for (const indent of [1, 2, 3]) {
    assert.equal(
      renderMarkdown(`Intro\n${' '.repeat(indent)}## Experience`),
      '<p>Intro</p>\n<h2>Experience</h2>',
    );
  }
});

test('bare heading markers create empty headings and interrupt paragraphs', () => {
  for (const level of [1, 3, 6]) {
    assert.equal(
      renderMarkdown(`Intro\n${'#'.repeat(level)}`),
      `<p>Intro</p>\n<h${level}></h${level}>`,
    );
  }
});

test('an indented heading ends a table even when its text contains a pipe', () => {
  const html = renderMarkdown('| A | B |\n| - | - |\n| x | y |\n  ## Skills | Tools');
  assert.ok(html.endsWith('</table></div>\n<h2>Skills | Tools</h2>'), html);
});

test('offset and inline formatting apply to indented headings', () => {
  assert.equal(
    renderMarkdown('   ## **Experience** ##', { headingOffset: 1 }),
    '<h3><strong>Experience</strong></h3>',
  );
});

test('space and tab delimiters allow empty headings and closing hashes', () => {
  assert.equal(renderMarkdown('# \t'), '<h1></h1>');
  assert.equal(renderMarkdown(' ##\tTitle\t###\t'), '<h2>Title</h2>');
});

test('literal trailing hashes remain part of technical headings', () => {
  assert.equal(renderMarkdown('  ## C# and F#'), '<h2>C# and F#</h2>');
});

test('four-space indentation and seven opening hashes do not make headings', () => {
  assert.ok(!renderMarkdown('    ## Text').includes('<h2>'));
  assert.ok(!renderMarkdown('####### Text').includes('<h6>'));
});

test('a nonbreaking space is text rather than an ATX delimiter', () => {
  assert.equal(renderMarkdown('#\u00a0Title'), '<p>#\u00a0Title</p>');
});

test('ordinary words beginning with hashes do not interrupt a paragraph', () => {
  assert.equal(renderMarkdown('Intro\n##hashtag'), '<p>Intro<br />##hashtag</p>');
});

test('fenced code keeps indented heading syntax literal', () => {
  assert.equal(renderMarkdown('```\n  ## Example\n```'), '<pre><code>  ## Example\n</code></pre>');
});
