import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flagBool, parseArgs } from '../dist/cli/args.js';

test('the unpaid alias preserves a job path wherever the flag appears', () => {
  for (const argv of [
    ['post', '--unpaid', 'job.md'],
    ['--unpaid', 'post', 'job.md'],
    ['post', '--unpaid=false', 'job.md'],
    ['post', '--unpaid', '--', 'job.md'],
  ]) {
    const args = parseArgs(argv);
    assert.equal(args.command, 'post');
    assert.deepEqual(args.positional, ['job.md'], argv.join(' '));
    assert.equal(flagBool(args, 'unpaid'), argv.includes('--unpaid=false') ? false : true);
  }
});
