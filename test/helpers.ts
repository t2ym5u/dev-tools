import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "dev-tools-test-"));
}

export function removeTmpDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function writeFile(
  dir: string,
  relativePath: string,
  content: string,
): string {
  const filePath = path.join(dir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

// Creates a fake `pnpm` executable on a directory that can be prepended to
// PATH, so e2e tests never touch the network.
export function makeFakePnpm(dir: string): string {
  const binDir = path.join(dir, "fakebin");
  mkdirSync(binDir, { recursive: true });
  const pnpmPath = path.join(binDir, "pnpm");
  writeFileSync(pnpmPath, "#!/bin/sh\nexit 0\n");
  chmodSync(pnpmPath, 0o755);
  return binDir;
}

export function pathWithFakePnpm(dir: string): string {
  const binDir = makeFakePnpm(dir);
  return `${binDir}${path.delimiter}${process.env.PATH}`;
}
