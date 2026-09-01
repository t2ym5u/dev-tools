import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultEnvs, packageSourceEnvs } from "../../bin/envs.js";

test("defaultEnvs declares DEV, QLF and PROD with their aliases", () => {
  assert.deepEqual(defaultEnvs, {
    DEV: ["dev", "develop", "development"],
    QLF: ["qlf", "qualif", "qualification"],
    PROD: ["prod", "production"],
  });
});

test("packageSourceEnvs is limited to PROD then DEV", () => {
  assert.deepEqual(packageSourceEnvs, ["PROD", "DEV"]);
});
