#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs, { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EnvsConfig } from "./envs.ts";
import { defaultEnvs, packageSourceEnvs } from "./envs.ts";
import { computeTargetEnvs } from "./prepare-env.lib.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const switchPackageSource = path.join(__dirname, "switch-package-source.ts");
const cwd = process.cwd();

const configPath = path.join(cwd, "envs.config.mjs");
const envs: EnvsConfig = fs.existsSync(configPath)
  ? ((await import(pathToFileURL(configPath).href)).default as EnvsConfig)
  : defaultEnvs;

const targetEnvs = computeTargetEnvs(envs, packageSourceEnvs);

for (const env of targetEnvs) {
  execFileSync(process.execPath, [switchPackageSource, env], {
    cwd,
    stdio: "inherit",
  });
  execFileSync("pnpm", ["install"], { cwd, stdio: "inherit" });
  copyFileSync(
    path.join(cwd, "package.json"),
    path.join(cwd, `package.json__${env}__`),
  );
  copyFileSync(
    path.join(cwd, "pnpm-lock.yaml"),
    path.join(cwd, `pnpm-lock.yaml__${env}__`),
  );
}
