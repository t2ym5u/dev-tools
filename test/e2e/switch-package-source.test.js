import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { makeTmpDir, removeTmpDir, writeFile } from "../helpers.js";

const bin = path.resolve(
  import.meta.dirname,
  "../../bin/switch-package-source.js",
);

function run(cwd, args = []) {
  return execFileSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function runCapture(cwd, args = []) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}

function setupProject(cwd, { config, packageJson, lockfile }) {
  writeFile(cwd, "switch-package-source.config.mjs", config);
  writeFile(cwd, "package.json", JSON.stringify(packageJson, null, 2));
  writeFile(cwd, "pnpm-lock.yaml", lockfile);
}

test("errors out when the config file is missing", () => {
  const cwd = makeTmpDir();
  try {
    const { status, output } = runCapture(cwd);
    assert.notEqual(status, 0);
    assert.match(
      output,
      /switch-package-source\.config\.mjs not found at the project root\./,
    );
  } finally {
    removeTmpDir(cwd);
  }
});

test("throws on an unknown host", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd, {
      config: 'export default { host: "unknown", org: "org" };\n',
      packageJson: { dependencies: {} },
      lockfile: "",
    });
    assert.throws(() => run(cwd));
  } finally {
    removeTmpDir(cwd);
  }
});

test("switches from PROD to DEV using the detected environment", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd, {
      config: 'export default { host: "bitbucket", org: "coverfield" };\n',
      packageJson: {
        dependencies: {
          pkg: "https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz",
        },
      },
      lockfile:
        "  pkg:\n    resolution: {tarball: https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz}\n",
    });
    const out = run(cwd);
    assert.match(out, /Env is set to : PROD/);
    assert.match(out, /Switching env to : DEV/);
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json")));
    assert.equal(pkg.dependencies.pkg, "bitbucket:coverfield/pkg");
  } finally {
    removeTmpDir(cwd);
  }
});

test("switches DEV to PROD using the commit found in the lockfile", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd, {
      config: 'export default { host: "bitbucket", org: "coverfield" };\n',
      packageJson: { dependencies: { pkg: "bitbucket:coverfield/pkg" } },
      lockfile: "  - git+ssh://git@bitbucket.org:coverfield/pkg.git#abc123\n",
    });
    run(cwd);
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json")));
    assert.equal(
      pkg.dependencies.pkg,
      "https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz",
    );
  } finally {
    removeTmpDir(cwd);
  }
});

test("forces a specific environment regardless of the detected one", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd, {
      config: 'export default { host: "bitbucket", org: "coverfield" };\n',
      packageJson: {
        dependencies: {
          pkg: "https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz",
        },
      },
      lockfile:
        "  pkg:\n    resolution: {tarball: https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz}\n",
    });
    const out = run(cwd, ["PROD"]);
    assert.match(out, /Switching env to : PROD \(Force\)/);
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json")));
    assert.equal(
      pkg.dependencies.pkg,
      "https://bitbucket.org/coverfield/pkg/get/abc123.tar.gz",
    );
  } finally {
    removeTmpDir(cwd);
  }
});

test("throws when DEV and PROD dependencies are mixed", () => {
  const cwd = makeTmpDir();
  try {
    setupProject(cwd, {
      config: 'export default { host: "bitbucket", org: "coverfield" };\n',
      packageJson: {
        dependencies: {
          a: "bitbucket:coverfield/a",
          b: "https://bitbucket.org/coverfield/b/get/abc.tar.gz",
        },
      },
      lockfile: "",
    });
    assert.throws(() => run(cwd));
  } finally {
    removeTmpDir(cwd);
  }
});

test("honors a custom lockfile name and a custom host object", () => {
  const cwd = makeTmpDir();
  try {
    writeFile(
      cwd,
      "switch-package-source.config.mjs",
      [
        "export default {",
        '  org: "org",',
        '  lockfile: "npm-shrinkwrap.json",',
        "  host: {",
        '    match: (version) => version.includes("example.com"),',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal source of the generated config file, not an interpolation bug
        "    dev: ({ org, pkg }) => `git+https://example.com/${org}/${pkg}.git`,",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal source of the generated config file, not an interpolation bug
        "    prod: ({ org, pkg, commit }) => `https://example.com/${org}/${pkg}/${commit}.tar.gz`,",
        '    extractCommit: () => "deadbeef",',
        "  },",
        "};",
        "",
      ].join("\n"),
    );
    writeFile(
      cwd,
      "package.json",
      JSON.stringify(
        { dependencies: { pkg: "git+https://example.com/org/pkg.git" } },
        null,
        2,
      ),
    );
    writeFile(cwd, "npm-shrinkwrap.json", "{}");

    run(cwd);
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json")));
    assert.equal(
      pkg.dependencies.pkg,
      "https://example.com/org/pkg/deadbeef.tar.gz",
    );
  } finally {
    removeTmpDir(cwd);
  }
});
