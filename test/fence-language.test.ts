import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../dist/markup/markdown.js';

test('C# examples remain literal fenced code with the correct language', () => {
  const source = '```c#\n# example heading\n**literal example**\n```\nAfter the example';
  assert.equal(
    renderMarkdown(source),
    '<pre><code class="language-c#"># example heading\n**literal example**\n</code></pre>\n<p>After the example</p>',
  );
});

test('F# tilde fences render within a blockquote', () => {
  const source = '> ~~~f#\n> let answer = 42\n> ~~~';
  assert.equal(
    renderMarkdown(source),
    '<blockquote><pre><code class="language-f#">let answer = 42\n</code></pre></blockquote>',
  );
});

test('an unterminated C# fence retains the code through the end of the document', () => {
  assert.equal(
    renderMarkdown('```C#\n- literal list item'),
    '<pre><code class="language-C#">- literal list item\n</code></pre>',
  );
});

test('existing plus and hyphen language identifiers retain their rendering', () => {
  for (const language of ['c++', 'objective-c']) {
    assert.equal(
      renderMarkdown(`~~~${language}\nexample\n~~~`),
      `<pre><code class="language-${language}">example\n</code></pre>`,
    );
  }
});
