import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalisePay } from '../dist/schema/pay.js';

test('text-wrapped pay objects retain settlement methods just like string lines', () => {
  const text = '$100 an hour paid in USDC';
  const expected = normalisePay({ pay: [text] });
  assert.deepEqual(normalisePay({ pay: [{ text }] }), expected);
  assert.deepEqual(normalisePay({ pay: { lines: [{ text }] } }), expected);
  const override = normalisePay({ pay: [{ text }], payMethod: 'SOL' });
  assert.notEqual(typeof override, 'string');
  if (typeof override !== 'string') assert.equal(override.method, 'SOL');
  const first = normalisePay({ pay: [{ text }, '$5 fixed paid in ETH'] });
  assert.notEqual(typeof first, 'string');
  if (typeof first !== 'string') assert.equal(first.method, 'USDC');
  assert.equal(typeof normalisePay({ pay: [{ text: 'not a pay line' }] }), 'string');
});

test('invalid supplied salary endpoints are rejected instead of silently dropped', () => {
  for (const input of [
    { pay: [{ type: 'hourly', min: 80, max: '100usd' }] },
    { pay: [{ type: 'hourly', amount: 'not a number', min: 80 }] },
    { salaryMin: 80_000, salaryMax: 'not a number' },
  ]) {
    const result = normalisePay(input);
    assert.equal(typeof result, 'string', JSON.stringify(input));
    assert.match(String(result), /amount.*non-negative number/i);
  }
});
