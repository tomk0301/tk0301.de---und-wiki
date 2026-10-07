import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, utimes } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('session expires by inactivity, can be refreshed, and can be revoked', async () => {
  const previous = process.cwd();
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-idle-test-'));
  process.chdir(root);
  try {
    const { createIdleSession, remainingIdleSeconds, touchIdleSession, revokeIdleSession } = await import('../lib/idle-session.ts');
    const token = 'signed-test-token';
    assert.equal(await remainingIdleSeconds(token, 1), 0);
    await createIdleSession(token);
    assert.ok(await remainingIdleSeconds(token, 1) > 0);
    assert.equal(await touchIdleSession(token, 1), 60);
    const directory = path.join(root, '.wrangler', 'wiki-sessions');
    const { readdir } = await import('node:fs/promises');
    const file = path.join(directory, (await readdir(directory))[0]);
    assert.equal((await stat(file)).mode & 0o077, 0);
    const old = new Date(Date.now() - 65_000);
    await utimes(file, old, old);
    assert.equal(await remainingIdleSeconds(token, 1), 0);
    assert.equal(await touchIdleSession(token, 1), 0);
    await revokeIdleSession(token);
    assert.equal(await remainingIdleSeconds(token, 1), 0);
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
});
