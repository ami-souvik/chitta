#!/usr/bin/env node
/**
 * Turborepo-compatible launcher for the FastAPI backend.
 * - Creates a virtualenv if one doesn't exist
 * - Installs requirements if needed
 * - Starts uvicorn with --reload
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const API_DIR = path.resolve(__dirname, "../apps/api");
const VENV_DIR = path.join(API_DIR, ".venv");
const PYTHON =
  process.platform === "win32"
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python");
const UVICORN =
  process.platform === "win32"
    ? path.join(VENV_DIR, "Scripts", "uvicorn.exe")
    : path.join(VENV_DIR, "bin", "uvicorn");
const REQ = path.join(API_DIR, "requirements.txt");
const STAMP = path.join(VENV_DIR, ".installed_stamp");

// ── 1. Ensure .env exists ─────────────────────────────────────────────────────
const envFile = path.join(API_DIR, ".env");
const envExample = path.join(API_DIR, ".env.example");
if (!fs.existsSync(envFile)) {
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    console.warn(
      "\n⚠️  Created apps/api/.env from .env.example — fill in your secrets before the API will work.\n"
    );
  } else {
    console.warn("\n⚠️  No apps/api/.env found. API may fail to start.\n");
  }
}

// ── 2. Create venv if missing ─────────────────────────────────────────────────
if (!fs.existsSync(PYTHON)) {
  console.log("🐍 Creating Python virtualenv at apps/api/.venv …");
  execSync(`python3 -m venv ${VENV_DIR}`, { stdio: "inherit" });
}

// ── 3. Install / sync requirements when requirements.txt is newer than stamp ──
const reqMtime = fs.statSync(REQ).mtimeMs;
const stampMtime = fs.existsSync(STAMP) ? fs.statSync(STAMP).mtimeMs : 0;
if (reqMtime > stampMtime) {
  console.log("📦 Installing Python dependencies …");
  execSync(`${PYTHON} -m pip install -q -r ${REQ}`, { stdio: "inherit" });
  fs.writeFileSync(STAMP, new Date().toISOString());
}

// ── 4. Start uvicorn ──────────────────────────────────────────────────────────
console.log("🚀 Starting FastAPI on http://localhost:8000 …\n");
const proc = spawn(
  UVICORN,
  ["main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
  {
    cwd: API_DIR,
    stdio: "inherit",
    env: { ...process.env },
  }
);

proc.on("error", (err) => {
  console.error("Failed to start uvicorn:", err.message);
  process.exit(1);
});

proc.on("exit", (code) => process.exit(code ?? 0));

// Forward termination signals so Turbo can kill the process cleanly
process.on("SIGTERM", () => proc.kill("SIGTERM"));
process.on("SIGINT",  () => proc.kill("SIGINT"));
