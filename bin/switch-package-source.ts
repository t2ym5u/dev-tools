#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Host } from "./switch-package-source.lib.ts";
import {
  applyVersions,
  detectEnvFromPackage,
  getPrivateDeps,
  resolveHost,
} from "./switch-package-source.lib.ts";

interface SwitchPackageSourceConfig {
  host: string | Host;
  org: string;
  lockfile?: string;
}

const cwd = process.cwd();

const configPath = path.join(cwd, "switch-package-source.config.mjs");
if (!fs.existsSync(configPath)) {
  console.error(
    "switch-package-source.config.mjs not found at the project root.",
  );
  process.exit(1);
}
const { default: config } = (await import(pathToFileURL(configPath).href)) as {
  default: SwitchPackageSourceConfig;
};

const host = resolveHost(config.host);
if (!host) {
  throw new Error(`Unknown host: ${String(config.host)}`);
}
const { org } = config;
const lockfileName = config.lockfile ?? "pnpm-lock.yaml";

const packageFile = fs.readFileSync(path.join(cwd, "package.json"));
const lockFile = fs.readFileSync(path.join(cwd, lockfileName));

const jsonPkg = JSON.parse(packageFile.toString());

const env = detectEnvFromPackage(jsonPkg, host);
let newEnv: "DEV" | "PROD" = env === "DEV" ? "PROD" : "DEV";
const privateDeps = getPrivateDeps(
  jsonPkg,
  lockFile.toString().split("\n"),
  host,
);

const forceEnv = process.argv[2];
if (forceEnv === "DEV" || forceEnv === "PROD") {
  newEnv = forceEnv;
}

console.log(`> Env is set to : ${env}`);
console.log(`> Switching env to : ${newEnv} ${forceEnv ? "(Force)" : ""}`);

const newJsonPkg = applyVersions(
  packageFile.toString(),
  privateDeps,
  host,
  org,
  newEnv,
);

fs.writeFileSync(path.join(cwd, "package.json"), newJsonPkg);
