import assert from "node:assert/strict";
import { test } from "node:test";
import { getEnvFromArg, targetFilename } from "../../src/switch-config.lib.ts";

const availableEnvs = {
  DEV: ["dev", "develop", "development"],
  QLF: ["qlf", "qualif", "qualification"],
  PROD: ["prod", "production"],
};

test("getEnvFromArg resolves an env whose lowercase form is itself an alias", () => {
  assert.equal(getEnvFromArg(availableEnvs, "PROD"), "PROD");
});

test("getEnvFromArg resolves an alias case-insensitively", () => {
  assert.equal(getEnvFromArg(availableEnvs, "Prod"), "PROD");
  assert.equal(getEnvFromArg(availableEnvs, "develop"), "DEV");
});

test("getEnvFromArg trims whitespace", () => {
  assert.equal(getEnvFromArg(availableEnvs, "  qlf  "), "QLF");
});

test("getEnvFromArg returns null for an unknown alias", () => {
  assert.equal(getEnvFromArg(availableEnvs, "staging"), null);
});

test("targetFilename strips the trailing __ENV__ marker", () => {
  assert.equal(targetFilename("config.json__PROD__"), "config.json");
  assert.equal(
    targetFilename("nested/config.json__DEV__"),
    "nested/config.json",
  );
});

test("targetFilename handles filenames containing __ elsewhere", () => {
  assert.equal(
    targetFilename("a__b/config__file.json__PROD__"),
    "a__b/config__file.json",
  );
});
