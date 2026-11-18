import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(backend, "..");

test("Render runtime migration assets match the canonical SQL files", async () => {
  const names = [
    "001_initial.sql",
    "002_auth_sessions.sql",
    "003_tenant_rls.sql",
    "004_tenant_relationships.sql",
    "005_mfa_recovery.sql",
    "006_mfa_challenge.sql",
    "007_exclusive_owner.sql",
    "008_financial_accounts_funds.sql",
  ];
  for (const name of names) {
    const canonical = await fs.readFile(path.join(root, "db", name), "utf8");
    const runtime = await fs.readFile(path.join(backend, "db", name), "utf8");
    assert.equal(runtime, canonical, name + " differs from canonical migration");
  }
});
