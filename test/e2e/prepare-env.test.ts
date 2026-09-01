import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  makeTmpDir,
  pathWithFakePnpm,
  removeTmpDir,
  writeFile,
} from "../helpers.ts";

const bin = path.resolve(import.meta.dirname, "../../src/prepare-env.ts");

function run(cwd: string): string {
  return execFileSync(process.execPath, [bin], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PATH: pathWithFakePnpm(cwd) },
  });
}

function setupProject(cwd: string): void {
  writeFile(
    cwd,
    "switch-package-source.config.mjs",
    'export default { host: "bitbucket", org: "coverfield" };\n',
  );
  writeFile(
    cwd,
    "package.json",
    JSON.stringify(
      { dependencies: { pkg: "bitbucket:coverfield/pkg" } },
      null,
      2,
    ),
  );
  writeFile(
    cwd,
    "pnpm-lock.yaml",
    "  - git+ssh://git@bitbucket.org:coverfield/pkg.git#abc123\n",
  );
}

test("generates __PROD__ and __DEV__ variants by default", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd);
    run(cwd);

    const prodPkg = JSON.parse(
      readFileSync(path.join(cwd, "package.json__PROD__"), "utf8"),
    );
    assert.equal(
      prodPkg.dependencies.pkg,
      "https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz",
    );
    assert.equal(existsSync(path.join(cwd, "pnpm-lock.yaml__PROD__")), true);

    const devPkg = JSON.parse(
      readFileSync(path.join(cwd, "package.json__DEV__"), "utf8"),
    );
    assert.equal(devPkg.dependencies.pkg, "bitbucket:coverfield/pkg");
    assert.equal(existsSync(path.join(cwd, "pnpm-lock.yaml__DEV__")), true);
  } finally {
    removeTmpDir(cwd);
  }
});

test("only processes the environments declared in envs.config.mjs", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd);
    writeFile(cwd, "envs.config.mjs", 'export default { DEV: ["dev"] };\n');
    run(cwd);

    assert.equal(existsSync(path.join(cwd, "package.json__PROD__")), false);
    assert.equal(existsSync(path.join(cwd, "package.json__DEV__")), true);
  } finally {
    removeTmpDir(cwd);
  }
});
