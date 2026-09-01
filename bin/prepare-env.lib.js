// prepare-env only processes what switch-package-source can handle,
// even if envs.config.mjs declares other environments (e.g. QLF).
export function computeTargetEnvs(envs, packageSourceEnvs) {
    return packageSourceEnvs.filter((env) => Object.keys(envs).includes(env));
}
