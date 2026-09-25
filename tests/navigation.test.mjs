import { strict as assert } from "node:assert";
import { test } from "node:test";
import { navigationItems } from "../lib/navigation.ts";

test("all administration destinations are in the shared navigation", () => {
  const items = navigationItems("admin");
  assert.deepEqual(items.map((item) => item.href), [
    "/wiki", "/verwaltung", "/verwaltung/articles", "/verwaltung/benutzer",
    "/verwaltung/einstellungen", "/verwaltung/backup",
  ]);
  assert.equal(new Set(items.map((item) => item.href)).size, items.length);
});

test("readers and guests do not receive administration destinations", () => {
  for (const role of ["reader", null]) {
    assert.deepEqual(navigationItems(role), [{ href: "/wiki", label: "Hauptseite" }]);
  }
});
