import assert from 'node:assert/strict';
import { test } from 'node:test';
import { docxToMarkdown } from '../dist/core/import.js';

// Minimal stored ZIP with a central directory, sufficient for the DOCX reader.
function docx(xml: string): Buffer {
  const name = Buffer.from('word/document.xml');
  const data = Buffer.from(xml);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(local.length + name.length + data.length, 16);
  return Buffer.concat([local, name, data, central, name, end]);
}

test('spaced empty text', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t /><w:t>Engineer</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'Engineer');
});

test('attributed empty text', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t xml:space="preserve"/><w:t>Engineer</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'Engineer');
});

test('controls after empty text', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t>First</w:t><w:t xml:space="preserve"/><w:br/><w:t>Second</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'First\nSecond');
});

test('bold text after empty text', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t /><w:t>Engineer</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, '**Engineer**');
});

test('compact empty text control', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t/><w:t>Engineer</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'Engineer');
});

test('paired empty text control', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t></w:t><w:t>Engineer</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'Engineer');
});

test('empty text does not consume adjacent controls or later text', async () => {
  for (const empty of ['<w:t/>', '<w:t />', '<w:t xml:space="preserve" />', '<w:t\n/>']) {
    const result = await docxToMarkdown(
      docx(
        `<w:document><w:body><w:p><w:r><w:t>A</w:t>${empty}<w:tab/>${empty}<w:t>B</w:t><w:cr/>${empty}<w:t>C</w:t></w:r></w:p></w:body></w:document>`,
      ),
    );
    assert.equal(result.markdown, 'A  B\nC', empty);
  }
});

test('an empty bold run does not add emphasis or lose a break', async () => {
  const result = await docxToMarkdown(
    docx(
      '<w:document><w:body><w:p><w:r><w:t>A</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve" /><w:br/></w:r><w:r><w:t>B &amp; C</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  assert.equal(result.markdown, 'A\nB & C');
});
