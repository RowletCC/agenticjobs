import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toPlainText } from '../dist/markup/markdown.js';

test('plain summaries preserve C# and F# names in ordinary prose', () => {
  assert.equal(toPlainText('Build services in C# and F#.'), 'Build services in C# and F#.');
});

test('plain summaries preserve issue references, hashtags, and URL fragments', () => {
  const source = 'Fix #42; tag #release; see https://example.com/guide#part.';
  assert.equal(toPlainText(source), source);
});

test('heading syntax is removed without deleting hashes from the heading text', () => {
  assert.equal(
    toPlainText('## C# and F# skills ##\n# References to #42'),
    'C# and F# skills References to #42',
  );
});

test('quoted headings keep literal hashes while losing heading and quote syntax', () => {
  assert.equal(toPlainText('> ## C# experience ##\n> #release'), 'C# experience #release');
});

test('ordinary headings, empty headings, and other inline markup still become plain text', () => {
  assert.equal(
    toPlainText('###\n## ###\n# Title #\nSome **bold** [words](https://example.com).'),
    'Title Some bold words.',
  );
});

test('code examples remain excluded from summaries', () => {
  assert.equal(toPlainText('Before\n```text\n# Not a heading\n```\nAfter'), 'Before After');
});
