import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardClient } from '../dist/client/client.js';
import { parseArgs } from '../dist/cli/args.js';
import { runRankings } from '../dist/cli/watches.js';

test('rankings display the period returned by the board, even after an unsupported request', async () => {
  let requested = '';
  const client = {
    rankings: async (options: { period: string }) => {
      requested = options.period;
      return {
        period: 'month',
        boards: [
          {
            id: 'popular',
            label: 'Most read',
            unit: 'Views',
            total: 1,
            rows: [
              {
                rank: 1,
                slug: 'engineer',
                name: 'Engineer',
                value: 3,
                display: '3 views',
                url: '/jobs/engineer',
              },
            ],
          },
        ],
      };
    },
  } as unknown as BoardClient;
  let human = '';
  await runRankings(parseArgs(['popular', '--period', 'day']), client, 'popular', (text) => {
    human = text;
    return 0;
  });
  assert.equal(requested, 'day');
  assert.match(human, /\(views, month\)/);
  assert.doesNotMatch(human, /\(views, day\)/);
});

test('empty rankings describe the board-returned period', async () => {
  const client = {
    rankings: async () => ({ period: 'month', boards: [] }),
  } as unknown as BoardClient;
  let human = '';
  await runRankings(parseArgs(['popular', '--period', 'day']), client, 'popular', (text) => {
    human = text;
    return 0;
  });
  assert.equal(human, 'Nothing to rank this month.');
});
