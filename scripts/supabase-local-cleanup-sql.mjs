#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";

import { runCommandAsync } from "./lib/command.mjs";
import {
  assertLocalBindings,
  forceRemoveProjectContainers,
  inspectProjectContainers,
  removeLocalProfile,
  removeNetworkIfUnused,
  selectLocalDbContainer,
  sanitizeCliFailure
} from "./lib/supabase-local.mjs";
import {
  dockerExecPsqlArgs,
  loadReviewedCleanupFile,
  parseCleanupArgs
} from "./lib/supabase-local-cleanup.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const args = parseCleanupArgs(process.argv.slice(2));
  const containers = assertLocalBindings(inspectProjectContainers());
  const db = selectLocalDbContainer(containers);
  const reviewed = await loadReviewedCleanupFile(args.file, args.sha256, args.mode);
  const result = await runCommandAsync("docker", dockerExecPsqlArgs(db.id), {
    cwd: repoRoot,
    input: reviewed.sql
  });
  assertLocalBindings(inspectProjectContainers());
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.stdout.write(`Local cleanup ${args.mode} completed; reviewed SHA-256 ${reviewed.actualSha256}.\n`);
} catch (error) {
  if (/Unsafe Docker binding|outside where-to-visit|safe local DB container|local Supabase stack is not running|Expected local Supabase port/.test(error.message)) {
    forceRemoveProjectContainers();
    await removeLocalProfile(repoRoot);
    await removeNetworkIfUnused();
  }
  process.stderr.write(`Local cleanup failed: ${sanitizeCliFailure(error)}\n`);
  process.exitCode = error.status ?? 1;
}
