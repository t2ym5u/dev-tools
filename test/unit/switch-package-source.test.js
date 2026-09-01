import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyVersions,
  builtinHosts,
  detectEnvFromPackage,
  getPrivateDeps,
  resolveHost,
} from "../../bin/switch-package-source.lib.js";

test("resolveHost resolves a built-in host by name", () => {
  assert.equal(resolveHost("bitbucket"), builtinHosts.bitbucket);
});

test("resolveHost returns undefined for an unknown built-in name", () => {
  assert.equal(resolveHost("unknown-host"), undefined);
});

test("resolveHost passes a custom host object through as-is", () => {
  const customHost = { match: () => true };
  assert.equal(resolveHost(customHost), customHost);
});

for (const [name, host] of Object.entries(builtinHosts)) {
  test(`${name}.match only matches versions mentioning the host`, () => {
    assert.equal(host.match(`${name}:org/pkg`), true);
    assert.equal(host.match("^1.2.3"), false);
  });

  test(`${name}.dev builds the git shorthand format`, () => {
    assert.equal(host.dev({ org: "org", pkg: "pkg" }), `${name}:org/pkg`);
  });

  test(`${name}.prod builds a tarball URL containing the commit`, () => {
    const url = host.prod({ org: "org", pkg: "pkg", commit: "abc123" });
    assert.match(url, /^https:\/\//);
    assert.match(url, /abc123/);
    assert.match(url, /\.tar\.gz/);
  });

  test(`${name}.extractCommit returns null when nothing matches`, () => {
    assert.equal(
      host.extractCommit({ lines: ["unrelated line"], pkg: "pkg" }),
      null,
    );
  });
}

test("bitbucket.extractCommit reads the commit from a git dependency line", () => {
  const lines = ["  - git+ssh://git@bitbucket.org:org/pkg.git#abc123"];
  assert.equal(
    builtinHosts.bitbucket.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("bitbucket.extractCommit strips a trailing annotation after the commit", () => {
  const lines = ["git+ssh://git@bitbucket.org:org/pkg.git#abc123(integrity)"];
  assert.equal(
    builtinHosts.bitbucket.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("bitbucket.extractCommit falls back to the tarball URL", () => {
  const lines = [
    "    resolution: {tarball: https://bitbucket.org/org/pkg/get/abc123.tar.gz}",
  ];
  assert.equal(
    builtinHosts.bitbucket.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("github.extractCommit reads the commit from a git dependency line", () => {
  const lines = ["git+https://github.com/org/pkg.git#abc123"];
  assert.equal(
    builtinHosts.github.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("github.extractCommit falls back to the archive tarball URL", () => {
  const lines = ["https://github.com/org/pkg/archive/abc123.tar.gz"];
  assert.equal(
    builtinHosts.github.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("gitlab.extractCommit reads the commit from a git dependency line", () => {
  const lines = ["git+https://gitlab.com/org/pkg.git#abc123"];
  assert.equal(
    builtinHosts.gitlab.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("gitlab.extractCommit falls back to the -/archive/ tarball URL", () => {
  const lines = [
    "https://gitlab.com/org/pkg/-/archive/abc123/pkg-abc123.tar.gz",
  ];
  assert.equal(
    builtinHosts.gitlab.extractCommit({ lines, pkg: "pkg" }),
    "abc123",
  );
});

test("getPrivateDeps only picks dependencies matching the host, across dependency kinds", () => {
  const host = builtinHosts.bitbucket;
  const packageJson = {
    dependencies: { a: "bitbucket:org/a", other: "^1.0.0" },
    devDependencies: { b: "bitbucket:org/b" },
  };
  const result = getPrivateDeps(packageJson, null, host);
  assert.deepEqual(result.map((d) => d.pkg).sort(), ["a", "b"]);
  assert.equal(result[0].commit, null);
});

test("getPrivateDeps ignores dependency kinds absent from package.json", () => {
  const host = builtinHosts.bitbucket;
  const result = getPrivateDeps({ dependencies: {} }, null, host);
  assert.deepEqual(result, []);
});

test("getPrivateDeps extracts the commit when lock lines are provided", () => {
  const host = builtinHosts.bitbucket;
  const packageJson = { dependencies: { pkg: "bitbucket:org/pkg" } };
  const lines = ["git+ssh://git@bitbucket.org:org/pkg.git#abc123"];
  const [dep] = getPrivateDeps(packageJson, lines, host);
  assert.equal(dep.commit, "abc123");
});

test("detectEnvFromPackage returns DEV for git-shorthand dependencies", () => {
  const host = builtinHosts.bitbucket;
  const packageJson = {
    dependencies: { a: "bitbucket:org/a", b: "bitbucket:org/b" },
  };
  assert.equal(detectEnvFromPackage(packageJson, host), "DEV");
});

test("detectEnvFromPackage returns PROD for tarball dependencies", () => {
  const host = builtinHosts.bitbucket;
  const packageJson = {
    dependencies: {
      a: "https://bitbucket.org/org/a/get/abc.tar.gz",
      b: "https://bitbucket.org/org/b/get/def.tar.gz",
    },
  };
  assert.equal(detectEnvFromPackage(packageJson, host), "PROD");
});

test("detectEnvFromPackage throws when DEV and PROD are mixed", () => {
  const host = builtinHosts.bitbucket;
  const packageJson = {
    dependencies: {
      a: "bitbucket:org/a",
      b: "https://bitbucket.org/org/b/get/def.tar.gz",
    },
  };
  assert.throws(
    () => detectEnvFromPackage(packageJson, host),
    /Mismatch Dev and Prod/,
  );
});

test("applyVersions rewrites every matching dependency to the DEV format", () => {
  const host = builtinHosts.bitbucket;
  const packageJsonText = JSON.stringify(
    { dependencies: { pkg: "https://bitbucket.org/org/pkg/get/abc.tar.gz" } },
    null,
    2,
  );
  const result = applyVersions(
    packageJsonText,
    [{ pkg: "pkg", commit: "abc" }],
    host,
    "org",
    "DEV",
  );
  assert.equal(JSON.parse(result).dependencies.pkg, "bitbucket:org/pkg");
});

test("applyVersions rewrites every matching dependency to the PROD format", () => {
  const host = builtinHosts.bitbucket;
  const packageJsonText = JSON.stringify(
    { dependencies: { pkg: "bitbucket:org/pkg" } },
    null,
    2,
  );
  const result = applyVersions(
    packageJsonText,
    [{ pkg: "pkg", commit: "abc123" }],
    host,
    "org",
    "PROD",
  );
  assert.equal(
    JSON.parse(result).dependencies.pkg,
    "https://bitbucket.org/org/pkg/get/abc123.tar.gz",
  );
});

test("applyVersions is a no-op for an empty dependency list", () => {
  const host = builtinHosts.bitbucket;
  const packageJsonText = JSON.stringify({ dependencies: {} });
  assert.equal(
    applyVersions(packageJsonText, [], host, "org", "DEV"),
    packageJsonText,
  );
});
