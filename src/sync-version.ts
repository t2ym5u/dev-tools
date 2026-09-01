#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applyVersionPattern } from "./sync-version.lib.ts";

interface SyncVersionTarget {
  file: string;
  pattern: RegExp;
}

const cwd = process.cwd();
const { version } = JSON.parse(
  readFileSync(path.join(cwd, "package.json"), "utf8"),
) as { version: string };

const configPath = path.join(cwd, "sync-version.config.mjs");
const { default: targets } = (await import(pathToFileURL(configPath).href)) as {
  default: SyncVersionTarget[];
};

for (const { file, pattern } of targets) {
  const filePath = path.join(cwd, file);
  const content = readFileSync(filePath, "utf8");

  writeFileSync(filePath, applyVersionPattern(content, pattern, version, file));
  execFileSync("git", ["add", file], { cwd });
}
