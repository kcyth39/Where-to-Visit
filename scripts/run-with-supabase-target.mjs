#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadSupabaseTarget,
  sanitizedChildEnvironment
} from "./lib/supabase-target.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [target, separator, command, ...args] = process.argv.slice(2);

if ((target !== "local" && target !== "remote") || separator !== "--" || !command) {
  console.error(
    "Usage: run-with-supabase-target.mjs <local|remote> -- <command> [args...]"
  );
  process.exit(1);
}

try {
  const profile = await loadSupabaseTarget(repoRoot, target);
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: sanitizedChildEnvironment(profile, target),
    stdio: "inherit"
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${command}: ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(`Supabase target gate failed: ${error.message}`);
  process.exit(1);
}
