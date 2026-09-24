import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseApplySchema } from '../dist/core/jobs.js';
import { validateApplication } from '../dist/core/applications.js';

test('custom select labels keep employer capitalization through an application', () => {
  const schema = normaliseApplySchema({
    fields: [
      {
        name: 'work_authorization',
        label: 'Work authorization',
        type: 'select',
        required: true,
        options: ['US Citizen', 'Permanent Resident', 'Other', 'us citizen'],
      },
    ],
  });

  assert.deepEqual(schema?.fields[0]?.options, ['US Citizen', 'Permanent Resident', 'Other']);
  const result = validateApplication(schema!, { work_authorization: 'us citizen' }, 'welcome');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.answers['work_authorization'], 'US Citizen');
});
