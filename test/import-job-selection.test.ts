import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractJob } from '../dist/core/import-job.js';

const sourceUrl = 'https://example.com/jobs/selection';

for (const scenario of [
  {
    label: 'separate JSON-LD blocks',
    expectedTitle: 'Complete role',
    expectedDescription: 'Build useful tools.',
    structured: `<script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting',
      title: 'Incomplete role',
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting',
      title: 'Complete role',
      description: 'Build useful tools.',
      employmentType: 'FULL_TIME',
      jobLocationType: 'TELECOMMUTE',
    })}</script>`,
  },
  {
    label: 'array and @graph nodes',
    expectedTitle: 'Complete graph role',
    expectedDescription: 'Ship it.',
    structured: `<script type="application/ld+json">${JSON.stringify([
      { '@type': 'JobPosting', description: 'Missing title.' },
      {
        '@graph': [
          { '@type': 'WebSite', name: 'Example' },
          {
            '@type': 'JobPosting',
            title: 'Complete graph role',
            description: 'Ship it.',
            employmentType: 'FULL_TIME',
            jobLocationType: 'TELECOMMUTE',
          },
        ],
      },
    ])}</script>`,
  },
  {
    label: 'a preceding posting whose HTML description is empty',
    expectedTitle: 'Readable role',
    expectedDescription: 'Readable description.',
    structured: `<script type="application/ld+json">${JSON.stringify([
      { '@type': 'JobPosting', title: 'Empty description', description: '<p> </p>' },
      {
        '@type': 'JobPosting',
        title: 'Readable role',
        description: '<p>Readable description.</p>',
        employmentType: 'FULL_TIME',
        jobLocationType: 'TELECOMMUTE',
      },
    ])}</script>`,
  },
]) {
  test(`selects the first usable JobPosting from ${scenario.label}`, () => {
    const job = extractJob(
      `<html><head>${scenario.structured}</head><body><main><h1>Page fallback</h1><p>Page text.</p></main></body></html>`,
      sourceUrl,
    );
    assert.equal(job.via, 'jsonld');
    assert.equal(job.title, scenario.expectedTitle);
    assert.equal(job.description, scenario.expectedDescription);
    assert.equal(job.employmentType, 'full-time');
    assert.equal(job.workplace, 'remote');
    assert.equal(job.sourceUrl, sourceUrl);
    assert.deepEqual(job.warnings, []);
  });
}

test('keeps the first valid JobPosting precedence', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting',
    title: 'First valid role',
    description: 'First description.',
  })}</script><script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting',
    title: 'Later valid role',
    description: 'Later description.',
  })}</script>`;
  const job = extractJob(html, sourceUrl);
  assert.equal(job.title, 'First valid role');
  assert.equal(job.description, 'First description.');
});

test('falls back to page content and keeps one missing-field warning when all postings are unusable', () => {
  const html = `<script type="application/ld+json">${JSON.stringify([
    { '@type': 'JobPosting', title: ' ' },
    { '@type': 'JobPosting', description: 'No title.' },
  ])}</script><main><h1>Page fallback</h1><p>Page text.</p></main>`;
  const job = extractJob(html, sourceUrl);
  assert.equal(job.via, 'page');
  assert.equal(job.title, 'Page fallback');
  assert.equal(job.description, 'Page fallback\nPage text.');
  assert.equal(
    job.warnings.filter((warning) => /missing a title or a description/i.test(warning)).length,
    1,
  );
});
