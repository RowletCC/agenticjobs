import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderInline } from '../dist/markup/markdown.js';

const examples = [
  ['``unclosed', '``unclosed'],
  ['``', '``'],
  ['```', '```'],
  ['`` a ``` b ``', '<code>a ``` b</code>'],
  ['`a``b`', '<code>a``b</code>'],
  ['``a`b``', '<code>a`b</code>'],
  ['``unmatched and `valid`', '``unmatched and <code>valid</code>'],
  ['`one` then ``two``', '<code>one</code> then <code>two</code>'],
  ['``` a `` b ` c ```', '<code>a `` b ` c</code>'],
  ['before ``  a ` b  `` after', 'before <code> a ` b </code> after'],
];

for (const [source, expected] of examples) {
  test(`code span delimiter runs: ${JSON.stringify(source)}`, () => {
    assert.equal(renderInline(source!), expected);
  });
}

test('unmatched backticks leave surrounding prose formatting intact', () => {
  assert.equal(
    renderInline('``unfinished **important**'),
    '``unfinished <strong>important</strong>',
  );
});
