import assert from "node:assert/strict";
import { test } from "node:test";
import { applyVersionPattern } from "../../bin/sync-version.lib.js";

test("applyVersionPattern replaces the version after the captured prefix", () => {
  const content = "**Current version:** 1.2.3\nrest of file";
  const pattern = /(\*\*Current version:\*\* )\d+\.\d+\.\d+/;
  assert.equal(
    applyVersionPattern(content, pattern, "1.3.0", "CLAUDE.md"),
    "**Current version:** 1.3.0\nrest of file",
  );
});

test("applyVersionPattern throws with the file name when the pattern isn't found", () => {
  const content = "no version here";
  const pattern = /(version: )\d+\.\d+\.\d+/;
  assert.throws(
    () => applyVersionPattern(content, pattern, "1.3.0", "CLAUDE.md"),
    /Version pattern not found in CLAUDE\.md/,
  );
});
