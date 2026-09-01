import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { makeTmpDir, removeTmpDir } from "../helpers.ts";

// The compiled bin/*.js output is what actually gets installed into a
// consumer's node_modules and invoked as a CLI. Node refuses to run
// TypeScript files located under a node_modules directory
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING) — this test simulates
// that install location to make sure only plain compiled JS ever needs
// to run from there.
const compiledBinDir = path.resolve(import.meta.dirname, "../../bin");

test("compiled bin scripts run correctly once installed under node_modules", () => {
  const cwd = makeTmpDir();
  try {
    const installDir = path.join(cwd, "node_modules", "dev-tools", "bin");
    mkdirSync(path.dirname(installDir), { recursive: true });
    cpSync(compiledBinDir, installDir, { recursive: true });

    const out = execFileSync(
      process.execPath,
      [path.join(installDir, "switch-config.js"), "--help"],
      { cwd, encoding: "utf8" },
    );
    assert.match(out, /Available environments/);
    assert.match(out, /DEV \(dev, develop, development\)/);
  } finally {
    removeTmpDir(cwd);
  }
});
