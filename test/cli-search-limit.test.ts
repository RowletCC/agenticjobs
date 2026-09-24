import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

test('search rejects invalid --limit values before contacting the board', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agenticjobs-cli-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? '');
    response.writeHead(200, { 'content-type': 'application/json', connection: 'close' });
    response.end(JSON.stringify({ items: [], total: 25, limit: 25, offset: 0, query: {} }));
  });
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  );
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');

  const run = promisify(execFile);
  for (const [option, value] of [
    ['--limit', '10.5'],
    ['--limit', '0'],
    ['--limit', '-1'],
    ['-n', '101'],
  ]) {
    await assert.rejects(
      () =>
        run(
          process.execPath,
          [
            fileURLToPath(new URL('../dist/cli/index.js', import.meta.url)),
            'search',
            'typescript',
            option,
            value,
            '--server',
            `http://127.0.0.1:${address.port}`,
          ],
          { env: { ...process.env, AGENTICJOBS_CONFIG_DIR: directory }, timeout: 10_000 },
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          (error as Error & { stderr: string }).stderr,
          /--limit must be a whole number from 1 to 100/i,
        );
        return true;
      },
    );
  }
  assert.deepEqual(requests, []);

  for (const value of ['1', '100']) {
    await run(
      process.execPath,
      [
        fileURLToPath(new URL('../dist/cli/index.js', import.meta.url)),
        'search',
        'typescript',
        '--limit',
        value,
        '--server',
        `http://127.0.0.1:${address.port}`,
      ],
      { env: { ...process.env, AGENTICJOBS_CONFIG_DIR: directory }, timeout: 10_000 },
    );
  }
  assert.deepEqual(requests, [
    '/api/v1/jobs?q=typescript&limit=1',
    '/api/v1/jobs?q=typescript&limit=100',
  ]);
});
