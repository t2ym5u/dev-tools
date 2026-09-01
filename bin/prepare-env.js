#!/usr/bin/env node
var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
import { execFileSync } from "node:child_process";
import fs, { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defaultEnvs, packageSourceEnvs } from "./envs.js";
import { computeTargetEnvs } from "./prepare-env.lib.js";
const selfPath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(selfPath);
const switchPackageSource = path.join(__dirname, `switch-package-source${path.extname(selfPath)}`);
const cwd = process.cwd();
const configPath = path.join(cwd, "envs.config.mjs");
const envs = fs.existsSync(configPath)
    ? (await import(__rewriteRelativeImportExtension(pathToFileURL(configPath).href))).default
    : defaultEnvs;
const targetEnvs = computeTargetEnvs(envs, packageSourceEnvs);
for (const env of targetEnvs) {
    execFileSync(process.execPath, [switchPackageSource, env], {
        cwd,
        stdio: "inherit",
    });
    execFileSync("pnpm", ["install"], { cwd, stdio: "inherit" });
    copyFileSync(path.join(cwd, "package.json"), path.join(cwd, `package.json__${env}__`));
    copyFileSync(path.join(cwd, "pnpm-lock.yaml"), path.join(cwd, `pnpm-lock.yaml__${env}__`));
}
