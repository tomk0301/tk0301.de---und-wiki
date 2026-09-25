import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import pkg from "../package.json" with { type: "json" };
import lock from "../package-lock.json" with { type: "json" };

test("footer release version has SCC's three-part format and matches lockfile", () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
});

test("minor and patch bumps follow the requested release scheme", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "wiki-version-"));
  try {
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
    writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ version: "1.0.0", packages: { "": { version: "1.0.0" } } }));
    const script = new URL("../scripts/bump-version.mjs", import.meta.url).pathname;
    const bump = (kind) => spawnSync(process.execPath, [script, kind], { env: { ...process.env, WIKI_VERSION_ROOT: root }, encoding: "utf8" });
    assert.equal(bump("patch").stdout.trim(), "1.0.1");
    assert.equal(bump("minor").stdout.trim(), "1.1.0");
    assert.equal(JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8")).version, "1.1.0");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
