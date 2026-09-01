export const defaultEnvs = {
    DEV: ["dev", "develop", "development"],
    QLF: ["qlf", "qualif", "qualification"],
    PROD: ["prod", "production"],
};
// Only environments switch-package-source knows how to handle (dependency
// source: private git in DEV, public tarball in PROD) — prepare-env is
// restricted to these even if envs.config.mjs declares others (e.g. QLF).
export const packageSourceEnvs = ["PROD", "DEV"];
