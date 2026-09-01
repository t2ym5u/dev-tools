import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTmpDir() {
  return mkdtempSync(path.join(os.tmpdir(), "dev-tools-test-"));
}

export function removeTmpDir(dir) {
  rmSync(dir, { recursive: true, force: true });
}

export function writeFile(dir, relativePath, content) {
  const filePath = path.join(dir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

// Creates a fake `pnpm` executable on a directory that can be prepended to
// PATH, so e2e tests never touch the network.
export function makeFakePnpm(dir) {
  const binDir = path.join(dir, "fakebin");
  mkdirSync(binDir, { recursive: true });
  const pnpmPath = path.join(binDir, "pnpm");
  writeFileSync(pnpmPath, "#!/bin/sh\nexit 0\n");
  chmodSync(pnpmPath, 0o755);
  return binDir;
}

export function pathWithFakePnpm(dir) {
  const binDir = makeFakePnpm(dir);
  return `${binDir}${path.delimiter}${process.env.PATH}`;
}
