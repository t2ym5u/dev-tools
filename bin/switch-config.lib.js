export function getEnvFromArg(availableEnvs, arg) {
  const inputEnv = arg.trim().toLowerCase();
  for (const [key, value] of Object.entries(availableEnvs)) {
    if (value.includes(inputEnv)) {
      return key;
    }
  }
  return null;
}

export function targetFilename(filename) {
  return filename.split("__").slice(0, -2).join("__");
}
