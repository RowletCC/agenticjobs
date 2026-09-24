import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callTool, type Caller } from '../dist/mcp/tools.js';

test('read_notifications reports when its mark-read request fails', async () => {
  const requested: string[] = [];
  const caller: Caller = {
    server: 'https://board.example.test',
    authenticated: true,
    call: async (_method, path) => {
      requested.push(path);
      if (path === '/api/v1/notifications') {
        return { status: 200, body: { items: [{ title: 'New job' }], unread: 1 } };
      }
      return {
        status: 503,
        body: { error: { message: 'Notification service unavailable.' } },
      };
    },
  };

  const result = await callTool(caller, 'read_notifications', { markRead: true });
  assert.deepEqual(requested, ['/api/v1/notifications', '/api/v1/notifications/read']);
  assert.equal(result.isError, true);
  assert.match(result.content[0]?.text ?? '', /Notification service unavailable/);
});
