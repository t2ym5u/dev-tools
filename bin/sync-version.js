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
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applyVersionPattern } from "./sync-version.lib.js";
const cwd = process.cwd();
const { version } = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
const configPath = path.join(cwd, "sync-version.config.mjs");
const { default: targets } = (await import(__rewriteRelativeImportExtension(pathToFileURL(configPath).href)));
for (const { file, pattern } of targets) {
    const filePath = path.join(cwd, file);
    const content = readFileSync(filePath, "utf8");
    writeFileSync(filePath, applyVersionPattern(content, pattern, version, file));
    execFileSync("git", ["add", file], { cwd });
}
