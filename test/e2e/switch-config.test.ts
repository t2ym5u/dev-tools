import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { makeTmpDir, removeTmpDir, writeFile } from "../helpers.ts";

const bin = path.resolve(import.meta.dirname, "../../src/switch-config.ts");

function run(cwd: string, args: string[]): string {
  return execFileSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function runCapture(cwd: string, args: string[]): string {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
  return `${result.stdout}${result.stderr}`;
}

test("prints and exits early when no env argument or NODE_ENV is set", () => {
  const cwd = makeTmpDir();
  try {
    const { NODE_ENV: _NODE_ENV, ...env } = process.env;
    const out = execFileSync(process.execPath, [bin], {
      cwd,
      encoding: "utf8",
      env,
    });
    assert.match(out, /No env set/);
  } finally {
    removeTmpDir(cwd);
  }
});

test("--help lists the default environments", () => {
  const cwd = makeTmpDir();
  try {
    const out = run(cwd, ["--help"]);
    assert.match(out, /DEV \(dev, develop, development\)/);
    assert.match(out, /PROD \(prod, production\)/);
  } finally {
    removeTmpDir(cwd);
  }
});

test("rejects an unknown environment", () => {
  const cwd = makeTmpDir();
  try {
    assert.throws(() => run(cwd, ["staging"]));
  } finally {
    removeTmpDir(cwd);
  }
});

test("switches a matching file and backs up the previous one", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(cwd, "config.json", "old");
    writeFile(cwd, "config.json__PROD__", "new");
    run(cwd, ["PROD"]);
    assert.equal(readFileSync(path.join(cwd, "config.json"), "utf8"), "new");
    assert.equal(
      readFileSync(path.join(cwd, "config.json.bck"), "utf8"),
      "old",
    );
  } finally {
    removeTmpDir(cwd);
  }
});

test("switches a matching file with no previous version to back up", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(cwd, "fresh.json__DEV__", "content");
    run(cwd, ["dev"]);
    assert.equal(readFileSync(path.join(cwd, "fresh.json"), "utf8"), "content");
    assert.equal(existsSync(path.join(cwd, "fresh.json.bck")), false);
  } finally {
    removeTmpDir(cwd);
  }
});

test("overwrites a stale backup file", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(cwd, "config.json", "current");
    writeFile(cwd, "config.json.bck", "stale");
    writeFile(cwd, "config.json__PROD__", "new");
    run(cwd, ["PROD"]);
    assert.equal(
      readFileSync(path.join(cwd, "config.json.bck"), "utf8"),
      "current",
    );
  } finally {
    removeTmpDir(cwd);
  }
});

test("ignores directories that happen to match the pattern", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(cwd, "config.json__PROD__/nested.txt", "irrelevant");
    const out = run(cwd, ["PROD"]);
    assert.doesNotMatch(out, /File updated/);
  } finally {
    removeTmpDir(cwd);
  }
});

test("reports an error and continues when a file can't be switched", () => {
  const cwd = makeTmpDir();
  try {
    // "conflict" exists as a directory, so it can't be overwritten by a file
    writeFile(cwd, "conflict/placeholder.txt", "x");
    writeFile(cwd, "conflict__PROD__", "new");
    const out = runCapture(cwd, ["PROD"]);
    assert.match(out, /Error on file conflict__PROD__/);
  } finally {
    removeTmpDir(cwd);
  }
});

test("honors a custom envs.config.mjs, replacing the default list", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(
      cwd,
      "envs.config.mjs",
      'export default { STAGING: ["staging"] };\n',
    );
    writeFile(cwd, "app.json__STAGING__", "staged");
    run(cwd, ["staging"]);
    assert.equal(readFileSync(path.join(cwd, "app.json"), "utf8"), "staged");
    assert.throws(() => run(cwd, ["PROD"]));
  } finally {
    removeTmpDir(cwd);
  }
});
