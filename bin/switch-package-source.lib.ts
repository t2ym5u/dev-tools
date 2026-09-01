export const depsNames = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export interface ExtractCommitContext {
  lines: string[];
  pkg: string;
}

export interface Host {
  match: (version: string) => boolean;
  dev: (ctx: { org: string; pkg: string }) => string;
  prod: (ctx: { org: string; pkg: string; commit: string | null }) => string;
  extractCommit: (ctx: ExtractCommitContext) => string | null;
}

export interface PrivateDep {
  pkg: string;
  version: string;
  commit: string | null;
}

// DEV (package manager git shorthand) and PROD (public tarball archive)
// formats are well established for these three hosts. Commit extraction
// from the lockfile, on the other hand, has only been verified in real
// conditions for Bitbucket — validate against a real pnpm-lock.yaml
// before relying on github/gitlab, or override via a custom `host` in
// the config (see README).
export const builtinHosts: Record<string, Host> = {
  bitbucket: {
    match: (version) => version.includes("bitbucket"),
    dev: ({ org, pkg }) => `bitbucket:${org}/${pkg}`,
    prod: ({ org, pkg, commit }) =>
      `https://bitbucket.org/${org}/${pkg}/get/${commit}.tar.gz`,
    extractCommit: ({ lines, pkg }) => {
      const gitLine = lines.find((l) => l.includes(`/${pkg}.git`));
      if (gitLine) {
        const parts = gitLine.split("#");
        return parts[parts.length - 1].split("(")[0].trim();
      }
      const tarballLine = lines.find((l) => l.includes(`/${pkg}/get`));
      if (!tarballLine) return null;
      const segments = tarballLine.split("/");
      return segments[segments.length - 1]
        .replace(/\.tar\.gz.*/, "")
        .split("(")[0]
        .trim();
    },
  },
  github: {
    match: (version) => version.includes("github"),
    dev: ({ org, pkg }) => `github:${org}/${pkg}`,
    prod: ({ org, pkg, commit }) =>
      `https://github.com/${org}/${pkg}/archive/${commit}.tar.gz`,
    extractCommit: ({ lines, pkg }) => {
      const gitLine = lines.find((l) => l.includes(`/${pkg}.git`));
      if (gitLine) {
        const parts = gitLine.split("#");
        return parts[parts.length - 1].split("(")[0].trim();
      }
      const tarballLine = lines.find((l) => l.includes(`/${pkg}/archive/`));
      if (!tarballLine) return null;
      const segments = tarballLine.split("/");
      return segments[segments.length - 1]
        .replace(/\.tar\.gz.*/, "")
        .split("(")[0]
        .trim();
    },
  },
  gitlab: {
    match: (version) => version.includes("gitlab"),
    dev: ({ org, pkg }) => `gitlab:${org}/${pkg}`,
    prod: ({ org, pkg, commit }) =>
      `https://gitlab.com/${org}/${pkg}/-/archive/${commit}/${pkg}-${commit}.tar.gz`,
    extractCommit: ({ lines, pkg }) => {
      const gitLine = lines.find((l) => l.includes(`/${pkg}.git`));
      if (gitLine) {
        const parts = gitLine.split("#");
        return parts[parts.length - 1].split("(")[0].trim();
      }
      const tarballLine = lines.find((l) => l.includes(`/${pkg}/-/archive/`));
      if (!tarballLine) return null;
      const segments = tarballLine.split("/archive/");
      return segments[1].split("/")[0];
    },
  },
};

export function resolveHost(host: string | Host): Host | undefined {
  return typeof host === "string" ? builtinHosts[host] : host;
}

export function getPrivateDeps(
  packageJson: Record<string, unknown>,
  lockLines: string[] | null,
  host: Host,
): PrivateDep[] {
  const result: PrivateDep[] = [];

  for (const depName of depsNames) {
    const deps = packageJson[depName] as Record<string, string> | undefined;
    if (!deps) continue;

    for (const [pkg, version] of Object.entries(deps)) {
      if (host.match(version)) {
        const commit = lockLines
          ? host.extractCommit({ lines: lockLines, pkg })
          : null;
        result.push({ pkg, version, commit });
      }
    }
  }

  return result;
}

export function detectEnvFromPackage(
  packageJson: Record<string, unknown>,
  host: Host,
): "DEV" | "PROD" {
  let isDev = false;
  let isProd = false;

  const dependencies = getPrivateDeps(packageJson, null, host);

  for (const { version } of dependencies) {
    isDev = isDev || !version.includes(".tar.gz");
    isProd = isProd || version.includes(".tar.gz");
  }

  if (isDev && isProd) {
    throw new Error("Mismatch Dev and Prod in package.json file");
  }

  return isDev ? "DEV" : "PROD";
}

export function applyVersions(
  packageJsonText: string,
  privateDeps: PrivateDep[],
  host: Host,
  org: string,
  newEnv: "DEV" | "PROD",
): string {
  let result = packageJsonText;

  for (const { pkg, commit } of privateDeps) {
    const newVersion =
      newEnv === "DEV"
        ? host.dev({ org, pkg })
        : host.prod({ org, pkg, commit });
    result = result.replace(
      new RegExp(`"${pkg}": "(.*)"`),
      `"${pkg}": "${newVersion}"`,
    );
  }

  return result;
}
