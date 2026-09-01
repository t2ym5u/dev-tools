import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTargetEnvs } from "../../bin/prepare-env.lib.js";

test("computeTargetEnvs keeps PROD then DEV when both are declared", () => {
  const envs = { DEV: ["dev"], QLF: ["qlf"], PROD: ["prod"] };
  assert.deepEqual(computeTargetEnvs(envs, ["PROD", "DEV"]), ["PROD", "DEV"]);
});

test("computeTargetEnvs drops PROD when it isn't declared", () => {
  const envs = { QLF: ["qlf"], DEV: ["dev"] };
  assert.deepEqual(computeTargetEnvs(envs, ["PROD", "DEV"]), ["DEV"]);
});

test("computeTargetEnvs returns an empty list when neither is declared", () => {
  const envs = { QLF: ["qlf"] };
  assert.deepEqual(computeTargetEnvs(envs, ["PROD", "DEV"]), []);
});
