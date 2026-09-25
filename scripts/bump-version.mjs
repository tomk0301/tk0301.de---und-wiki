#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

const change = process.argv[2];
if (change !== "minor" && change !== "patch") {
  console.error("Aufruf: node scripts/bump-version.mjs minor|patch");
  process.exit(2);
}

const root = process.env.WIKI_VERSION_ROOT || process.cwd();
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || lock.version !== pkg.version || lock.packages?.[""]?.version !== pkg.version) {
  throw new Error("Versionsstand in package.json und package-lock.json ist nicht konsistent");
}

const [major, minor, patch] = pkg.version.split(".").map(Number);
const next = change === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
pkg.version = next;
lock.version = next;
lock.packages[""].version = next;
for (const [file, content] of [[packagePath, pkg], [lockPath, lock]]) {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(content, null, 2)}\n`);
  renameSync(temporary, file);
}
console.log(next);
