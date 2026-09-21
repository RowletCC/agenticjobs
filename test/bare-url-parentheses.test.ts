import assert from 'node:assert/strict';
import test from 'node:test';
import { renderInline } from '../dist/markup/markdown.js';

const rel = 'nofollow ugc noopener noreferrer';
const link = (url: string) => `<a href="${url}" rel="${rel}">${url}</a>`;

const cases = [
  ['balanced path', 'https://example.com/report(2026)', 'https://example.com/report(2026)', '', ''],
  ['nested path', 'https://example.com/a(b(c))', 'https://example.com/a(b(c))', '', ''],
  [
    'surrounding parentheses',
    '(https://example.com/report(2026))',
    'https://example.com/report(2026)',
    '(',
    ')',
  ],
  [
    'sentence punctuation',
    'See https://example.com/report(2026).',
    'https://example.com/report(2026)',
    'See ',
    '.',
  ],
  ['multiple excess closers', 'https://example.com/a(b))).', 'https://example.com/a(b)', '', ')).'],
  [
    'ordinary trailing closer',
    '(https://example.com/report)',
    'https://example.com/report',
    '(',
    ')',
  ],
  [
    'encoded parentheses',
    'https://example.com/a%28b%29).',
    'https://example.com/a%28b%29',
    '',
    ').',
  ],
  [
    'query parentheses',
    'https://example.com/?q=(red)&lang=en.',
    'https://example.com/?q=(red)&amp;lang=en',
    '',
    '.',
  ],
] as const;
for (const [name, source, url, prefix, suffix] of cases) {
  test(`bare URL: ${name}`, () => {
    assert.equal(renderInline(source), prefix + link(url) + suffix);
  });
}
