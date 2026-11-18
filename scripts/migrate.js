"use strict";
// Compatibility entry point. The single maintained executor lives in backend/.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const runner = path.resolve(__dirname, "../backend/scripts/migrate.js");
const result = spawnSync(process.execPath, [runner], { stdio: "inherit", env: process.env });
if (result.error) {
  console.error("Could not start the staging migration executor:", result.error.message);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
