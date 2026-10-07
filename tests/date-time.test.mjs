import assert from 'node:assert/strict';
import test from 'node:test';
import { backupArchiveCreatedAt, formatDateTime, validDateTimeFormat, validTimeZone } from '../lib/date-time.ts';

test('Berlin timestamps follow summer/winter time and handle the DST transition', () => {
  const settings = { timeZone: 'Europe/Berlin', dateTimeFormat: 'de-DE' };
  assert.match(formatDateTime('2026-10-07T16:52:00Z', settings), /07\.10\.2026, 18:52:00/);
  assert.match(formatDateTime('2026-12-07T16:52:00Z', settings), /07\.12\.2026, 17:52:00/);
  assert.match(formatDateTime('2026-03-29T00:30:00Z', settings), /01:30:00/);
  assert.match(formatDateTime('2026-03-29T01:30:00Z', settings), /03:30:00/);
  assert.match(formatDateTime('2026-10-07T16:52:00Z', { ...settings, timeZone: 'UTC' }), /16:52:00/);
});

test('format, timezone validation and archive timestamps are consistent', () => {
  assert.equal(validTimeZone('Europe/Berlin'), true);
  assert.equal(validTimeZone('not-a-zone'), false);
  assert.equal(validDateTimeFormat('de-DE'), true);
  assert.equal(validDateTimeFormat('__proto__'), false);
  const createdAt = backupArchiveCreatedAt('wiki-20261007T165000Z-8c417073.tar.gpg');
  assert.equal(createdAt, '2026-10-07T16:50:00Z');
  assert.match(formatDateTime(createdAt, { timeZone: 'Europe/Berlin', dateTimeFormat: 'en-US' }), /06:50:00 PM/);
  assert.equal(formatDateTime('invalid', { timeZone: 'Europe/Berlin', dateTimeFormat: 'de-DE' }), '—');
});
