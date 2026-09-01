#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defaultEnvs } from "./envs.js";
import { getEnvFromArg, targetFilename } from "./switch-config.lib.js";

const cwd = process.cwd();

const args = process.argv.slice(2);
const env = args[0] || process.env.NODE_ENV;

const configPath = path.join(cwd, "envs.config.mjs");
const availableEnvs = fs.existsSync(configPath)
  ? (await import(pathToFileURL(configPath).href)).default
  : defaultEnvs;

if (!env) {
  console.log("No env set");
  process.exit(0);
}

console.log(env);

if (env === "--help") {
  console.log("This script switches config files");
  console.log("depending on the target environment");
  console.log("Available environments: ");
  for (const [key, value] of Object.entries(availableEnvs)) {
    console.log(`- ${key} (${value.join(", ")})`);
  }
  process.exit(0);
}

const formattedEnv = getEnvFromArg(availableEnvs, env);

if (!Object.keys(availableEnvs).includes(formattedEnv)) {
  console.log("Incorrect usage. Invalid environment.");
  console.log("Available environments: ");
  for (const [key, value] of Object.entries(availableEnvs)) {
    console.log(`- ${key} (${value.join(", ")})`);
  }
  console.log();
  console.log("--help to show help.");
  process.exit(1);
}

console.log("Moving files based on the environment");

// Recursively search for files matching the *__ENV__ pattern
// Uses fs/promises and a recursive function to walk directories
const findFiles = async (dir, pattern, result = []) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findFiles(fullPath, pattern, result);
    } else if (entry.isFile() && entry.name.includes(pattern)) {
      result.push(fullPath);
    }
  }
  return result;
};

(async () => {
  const pattern = `__${formattedEnv}__`;
  const files = await findFiles(".", pattern);

  for (const filename of files) {
    try {
      console.log(`File updated: ${filename}`);
      const f = targetFilename(filename);

      if (fs.existsSync(f)) {
        const backupFile = `${f}.bck`;
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
        fs.copyFileSync(f, backupFile);
        fs.unlinkSync(f);
      }

      fs.copyFileSync(filename, f);
    } catch (error) {
      console.error(`Error on file ${filename}:`, error);
    }
  }
})();
