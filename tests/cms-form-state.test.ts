import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogFailureState,
  extractCatalogFormValues,
  formFieldFromIssues,
  parseCatalogJson,
} from "../src/modules/catalog/form-state";

test("catalog form state preserves raw entered values, including malformed JSON", () => {
  const form = new FormData();
  form.set("name", "  برنج  ");
  form.set("translations", '{"fa":');
  form.set("attributes", "[");
  form.set("featured", "on");
  const state = catalogFailureState(
    form,
    ["name", "translations", "attributes", "featured"],
    ["featured"],
    { translations: "JSON is invalid", untrusted: "ignored" },
    "Save failed.",
  );

  assert.equal(state.submitted, true);
  assert.deepEqual(state.values, {
    name: "  برنج  ",
    translations: '{"fa":',
    attributes: "[",
    featured: true,
  });
  assert.deepEqual(state.fieldErrors, { translations: "JSON is invalid" });
  assert.equal(state.formError, "Save failed.");
});

test("JSON parser reports malformed text without changing the submitted value", () => {
  const malformed = '{"priceMinor": -1';
  assert.deepEqual(parseCatalogJson(malformed), { success: false });
  const form = new FormData();
  form.set("variants", malformed);
  assert.equal(extractCatalogFormValues(form, ["variants"]).variants, malformed);
});

test("schema issue paths point to real form fields for category and product errors", () => {
  assert.equal(
    formFieldFromIssues([{ path: ["parentId"] }], ["name", "slug", "parentId", "attributes"]),
    "parentId",
  );
  assert.equal(
    formFieldFromIssues([{ path: ["variants", 0, "priceMinor"] }], ["name", "variants", "attributes"]),
    "variants",
  );
  assert.equal(
    formFieldFromIssues([{ path: ["id"] }], ["name", "slug", "parentId", "attributes"]),
    undefined,
  );
});

test("unexpected form fields and operational secrets never enter returned state", () => {
  const form = new FormData();
  form.set("name", "Rice");
  form.set("databaseUrl", "postgres://secret-user:secret-pass@example/db");
  form.set("password", "private-value");
  const state = catalogFailureState(
    form,
    ["name", "slug"],
    [],
    { databaseUrl: "postgres error", password: "password error" },
    "The request could not be saved.",
  );

  const serialized = JSON.stringify(state);
  assert.deepEqual(state.values, { name: "Rice", slug: "" });
  assert.deepEqual(state.fieldErrors, {});
  assert.equal(serialized.includes("secret-pass"), false);
  assert.equal(serialized.includes("private-value"), false);
  assert.equal(serialized.includes("databaseUrl"), false);
});
