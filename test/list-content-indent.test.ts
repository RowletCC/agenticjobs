import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../dist/markup/markdown.js';

for (const prefix of ['12345. ', '123456789) ', '1.    ', '-    ', '  12345. ']) {
  test(`list content under ${JSON.stringify(prefix)} keeps its code indentation`, () => {
    const pad = ' '.repeat(prefix.length);
    const source = [
      prefix + 'Example',
      pad + '```js',
      pad + 'if (ready) {',
      pad + '  work();',
      pad + '}',
      pad + '```',
    ].join('\n');
    const html = renderMarkdown(source);
    assert.ok(
      html.includes('<pre><code class="language-js">if (ready) {\n  work();\n}\n</code></pre>'),
      html,
    );
  });
}

test('continuation indentation follows each marker width in one list', () => {
  const html = renderMarkdown(
    ['9999. First', '      > one', '10000. Second', '       > two'].join('\n'),
  );
  assert.equal((html.match(/<blockquote>/g) ?? []).length, 2, html);
  assert.ok(html.includes('<blockquote><p>one</p></blockquote>'), html);
  assert.ok(html.includes('<blockquote><p>two</p></blockquote>'), html);
});

test('nested list content uses its own marker width', () => {
  const html = renderMarkdown(
    ['- Parent', '  12345. Child', '         ```', '         nested', '         ```'].join('\n'),
  );
  assert.ok(html.includes('<ul><li><p>Parent</p>'), html);
  assert.ok(html.includes('<ol start="12345"><li><p>Child</p>'), html);
  assert.ok(html.includes('<pre><code>nested\n</code></pre>'), html);
});

test('ordinary short markers retain fenced blocks', () => {
  for (const prefix of ['- ', '1. ']) {
    const pad = ' '.repeat(prefix.length);
    const html = renderMarkdown(
      [prefix + 'Example', pad + '```', pad + 'short', pad + '```'].join('\n'),
    );
    assert.ok(html.includes('<pre><code>short\n</code></pre>'), html);
  }
});

test('ordinary short markers retain nested lists and quotes', () => {
  const list = renderMarkdown('- Parent\n  - Child');
  assert.ok(list.includes('<ul><li>Child</li></ul>'), list);
  const quote = renderMarkdown('1. Parent\n   > Quote');
  assert.ok(quote.includes('<blockquote><p>Quote</p></blockquote>'), quote);
});

test('unindented content after a list stays outside the list', () => {
  assert.equal(
    renderMarkdown('12345. Item\nAfter'),
    '<ol start="12345"><li>Item</li></ol>\n<p>After</p>',
  );
});

test('blank lines inside a list code fence remain in the code block', () => {
  const source = [
    '1. Example',
    '   ```text',
    '   alpha',
    '',
    '   beta',
    '   ```',
    '',
    'Outside',
  ].join('\n');
  const html = renderMarkdown(source);
  assert.ok(html.includes('<pre><code class="language-text">alpha\n\nbeta\n</code></pre>'), html);
  assert.ok(html.endsWith('</ol>\n<p>Outside</p>'), html);
});

test('several whitespace-only lines do not end a nested fenced block', () => {
  const source = [
    '- Parent',
    '  12345. Example',
    '         ```',
    '         alpha',
    '  ',
    '',
    '         beta',
    '         ```',
  ].join('\n');
  const html = renderMarkdown(source);
  assert.ok(html.includes('<pre><code>alpha\n\n\nbeta\n</code></pre>'), html);
});

test('blank lines before an outside block do not pull that block into the list', () => {
  assert.equal(renderMarkdown('- Item\n\nOutside'), '<ul><li>Item</li></ul>\n<p>Outside</p>');
  assert.equal(renderMarkdown('- Item\n\n# Heading'), '<ul><li>Item</li></ul>\n<h1>Heading</h1>');
});
