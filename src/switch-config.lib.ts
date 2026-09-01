import type { EnvsConfig } from "./envs.ts";

export function getEnvFromArg(
  availableEnvs: EnvsConfig,
  arg: string,
): string | null {
  const inputEnv = arg.trim().toLowerCase();
  for (const [key, value] of Object.entries(availableEnvs)) {
    if (value.includes(inputEnv)) {
      return key;
    }
  }
  return null;
}

export function targetFilename(filename: string): string {
  return filename.split("__").slice(0, -2).join("__");
}
