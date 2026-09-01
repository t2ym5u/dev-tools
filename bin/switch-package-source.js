#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  applyVersions,
  detectEnvFromPackage,
  getPrivateDeps,
  resolveHost,
} from "./switch-package-source.lib.js";

const cwd = process.cwd();

const configPath = path.join(cwd, "switch-package-source.config.mjs");
if (!fs.existsSync(configPath)) {
  console.error(
    "switch-package-source.config.mjs not found at the project root.",
  );
  process.exit(1);
}
const { default: config } = await import(pathToFileURL(configPath).href);

const host = resolveHost(config.host);
if (!host) {
  throw new Error(`Unknown host: ${config.host}`);
}
const { org } = config;
const lockfileName = config.lockfile ?? "pnpm-lock.yaml";

const packageFile = fs.readFileSync(path.join(cwd, "package.json"));
const lockFile = fs.readFileSync(path.join(cwd, lockfileName));

const jsonPkg = JSON.parse(packageFile);

const env = detectEnvFromPackage(jsonPkg, host);
let newEnv = env === "DEV" ? "PROD" : "DEV";
const privateDeps = getPrivateDeps(
  jsonPkg,
  lockFile.toString().split("\n"),
  host,
);

const forceEnv = process.argv[2];
if (forceEnv && ["DEV", "PROD"].includes(forceEnv)) {
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
