#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const { version } = JSON.parse(
  readFileSync(path.join(cwd, "package.json"), "utf8")
);

const configPath = path.join(cwd, "sync-version.config.mjs");
const { default: targets } = await import(pathToFileURL(configPath).href);

for (const { file, pattern } of targets) {
  const filePath = path.join(cwd, file);
  const content = readFileSync(filePath, "utf8");

  if (!pattern.test(content)) {
    throw new Error(`Pattern de version introuvable dans ${file}`);
  }

  writeFileSync(filePath, content.replace(pattern, `$1${version}`));
  execFileSync("git", ["add", file], { cwd });
}
