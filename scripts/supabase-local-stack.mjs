#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDockerLocalhostProxy } from "./lib/docker-localhost-proxy.mjs";
import {
  assertLocalBindings,
  ensureLocalNetwork,
  inspectProjectContainers,
  printSafeStatus,
  PROJECT_ID,
  removeLocalProfile,
  removeNetworkIfUnused,
  runSupabase,
  runSupabaseAsync,
  sanitizeCliFailure,
  writeLocalProfile,
  NETWORK_NAME
} from "./lib/supabase-local.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const operation = process.argv[2];

async function stopStack() {
  runSupabase(repoRoot, ["stop", "--project-id", PROJECT_ID], {
    allowFailure: true
  });
  const remaining = inspectProjectContainers();
  if (remaining.length > 0) {
    throw new Error("Supabase stop left project containers attached to the local network.");
  }
  await removeNetworkIfUnused();
  await removeLocalProfile(repoRoot);
}

async function startStack() {
  ensureLocalNetwork();
  const proxy = await createDockerLocalhostProxy();
  try {
    const startResult = await runSupabaseAsync(repoRoot, [
      "start",
      "-o",
      "env",
      "--network-id",
      NETWORK_NAME
    ], {
      env: {
        ...process.env,
        DOCKER_HOST: proxy.dockerHost
      }
    });
    const containers = assertLocalBindings();
    await writeLocalProfile(repoRoot, startResult.stdout);
    printSafeStatus(containers);
    console.log("Local Supabase profile: ready (values hidden)");
  } catch (error) {
    try {
      await stopStack();
    } catch {
      // Preserve the original start/binding error.
    }
    throw new Error(sanitizeCliFailure(error));
  } finally {
    await proxy.close();
  }
}

async function main() {
  switch (operation) {
    case "start":
      await startStack();
      break;
    case "status": {
      const containers = inspectProjectContainers();
      if (containers.some((container) => container.running)) {
        assertLocalBindings(containers);
      }
      printSafeStatus(containers);
      break;
    }
    case "stop":
      await stopStack();
      console.log("Local Supabase stack: stopped; persistent volumes retained");
      break;
    default:
      throw new Error("Usage: supabase-local-stack.mjs <start|status|stop>");
  }
}

main().catch((error) => {
  console.error(`Local Supabase wrapper failed: ${error.message}`);
  process.exitCode = 1;
});
