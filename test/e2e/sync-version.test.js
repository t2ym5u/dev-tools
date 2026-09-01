import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { makeTmpDir, removeTmpDir, writeFile } from "../helpers.js";

const bin = path.resolve(import.meta.dirname, "../../bin/sync-version.js");

function initGitRepo(cwd) {
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd });
  execFileSync("git", ["config", "user.name", "Test"], { cwd });
}

function run(cwd) {
  return execFileSync(process.execPath, [bin], { cwd, encoding: "utf8" });
}

test("syncs the version into every configured target and stages it", () => {
  const cwd = makeTmpDir();
  try {
    initGitRepo(cwd);
    writeFile(
      cwd,
      "package.json",
      JSON.stringify({ name: "app", version: "1.3.0" }, null, 2),
    );
    writeFile(cwd, "CLAUDE.md", "**Current version:** 1.2.0\n");
    writeFile(
      cwd,
      "sync-version.config.mjs",
      [
        "export default [",
        "  {",
        '    file: "CLAUDE.md",',
        "    pattern: /(\\*\\*Current version:\\*\\* )\\d+\\.\\d+\\.\\d+/,",
        "  },",
        "];",
        "",
      ].join("\n"),
    );

    run(cwd);

    assert.equal(
      readFileSync(path.join(cwd, "CLAUDE.md"), "utf8"),
      "**Current version:** 1.3.0\n",
    );
    const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd,
      encoding: "utf8",
    });
    assert.match(staged, /CLAUDE\.md/);
  } finally {
    removeTmpDir(cwd);
  }
});

test("throws when the pattern isn't found in the target file", () => {
  const cwd = makeTmpDir();
  try {
    initGitRepo(cwd);
    writeFile(
      cwd,
      "package.json",
      JSON.stringify({ name: "app", version: "1.3.0" }, null, 2),
    );
    writeFile(cwd, "CLAUDE.md", "no version marker here\n");
    writeFile(
      cwd,
      "sync-version.config.mjs",
      [
        "export default [",
        "  {",
        '    file: "CLAUDE.md",',
        "    pattern: /(\\*\\*Current version:\\*\\* )\\d+\\.\\d+\\.\\d+/,",
        "  },",
        "];",
        "",
      ].join("\n"),
    );

    const result = spawnSync(process.execPath, [bin], { cwd });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr.toString(),
      /Version pattern not found in CLAUDE\.md/,
    );
  } finally {
    removeTmpDir(cwd);
  }
});
