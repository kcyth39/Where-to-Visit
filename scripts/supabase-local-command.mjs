#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDockerLocalhostProxy } from "./lib/docker-localhost-proxy.mjs";
import {
  assertLocalBindings,
  assertNoUnsafeProjectBindings,
  forceRemoveProjectContainers,
  NETWORK_NAME,
  PROJECT_ID,
  removeLocalProfile,
  removeNetworkIfUnused,
  runSupabase,
  runSupabaseAsync,
  sanitizeCliFailure,
  writeLocalProfile
} from "./lib/supabase-local.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args.slice(0, 2).join(" ");
const allowedCommands = new Set([
  "migration list",
  "migration up",
  "db query",
  "db reset",
  "db advisors",
  "test db"
]);

function assertLocalOnlyCommand() {
  if (!allowedCommands.has(command)) {
    throw new Error(`Unsupported local Supabase command: ${command || "<empty>"}`);
  }

  if (!args.includes("--local")) {
    throw new Error("Every local database command must include --local.");
  }

  const forbidden = new Set([
    "--linked",
    "--db-url",
    "login",
    "link",
    "pull",
    "push",
    "repair"
  ]);
  if (args.some((argument) => forbidden.has(argument))) {
    throw new Error("Remote or migration-history options are forbidden by the local runner.");
  }

  if (args.includes("--network-id")) {
    throw new Error("The local runner owns the fixed Docker network-id.");
  }

  if (command === "db reset" && !args.includes("--no-seed")) {
    throw new Error("The formal local reset command requires --no-seed.");
  }
}

async function failClosed() {
  runSupabase(repoRoot, ["stop", "--project-id", PROJECT_ID], {
    allowFailure: true
  });
  forceRemoveProjectContainers();
  await removeNetworkIfUnused().catch(() => {});
  await removeLocalProfile(repoRoot).catch(() => {});
}

async function main() {
  assertLocalOnlyCommand();
  assertLocalBindings();
  const needsDockerCreateGuard = command === "db reset";
  const abortController = needsDockerCreateGuard ? new AbortController() : null;
  const proxy = needsDockerCreateGuard ? await createDockerLocalhostProxy({
    requireDatabaseCreate: true,
    onReject: () => abortController.abort()
  }) : null;
  let monitorError = null;
  const monitor = needsDockerCreateGuard ? setInterval(() => {
    try {
      assertNoUnsafeProjectBindings();
    } catch (error) {
      monitorError = error;
      abortController.abort();
    }
  }, 100) : null;

  try {
    const result = await runSupabaseAsync(
      repoRoot,
      [...args, "--network-id", NETWORK_NAME],
      proxy ? {
        signal: abortController.signal,
        env: {
          ...process.env,
          DOCKER_HOST: proxy.dockerHost
        }
      } : {}
    );
    if (monitorError) {
      throw monitorError;
    }
    proxy?.assertExpectedDatabaseCreateObserved();
    assertLocalBindings();
    await writeLocalProfile(repoRoot);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (proxy) {
      console.log("Local Docker proxy: DB container create observed with localhost-only bindings");
    }
  } catch (error) {
    if (needsDockerCreateGuard) {
      await failClosed();
    } else {
      try {
        assertLocalBindings();
      } catch {
        await failClosed();
      }
    }
    throw new Error(sanitizeCliFailure(error));
  } finally {
    if (monitor) {
      clearInterval(monitor);
    }
    await proxy?.close();
  }
}

main().catch((error) => {
  console.error(`Local Supabase command failed: ${error.message}`);
  process.exitCode = 1;
});
