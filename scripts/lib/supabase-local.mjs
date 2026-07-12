import { chmod, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import { runCommand, runCommandAsync } from "./command.mjs";

export const NETWORK_NAME = "where-to-visit-supabase-local";
export const PROJECT_ID = "Where-to-Visit";
export const EXPECTED_PORTS = new Set([54321, 54322, 54323, 54324, 54327]);

export function selectProjectContainers(containers) {
  const expectedSuffix = `_${PROJECT_ID}`;
  return containers.filter((container) => {
    const name = String(container.Name ?? "").replace(/^\//, "");
    const labels = container.Config?.Labels ?? {};
    const networks = Object.keys(container.NetworkSettings?.Networks ?? {});
    return (
      networks.includes(NETWORK_NAME) ||
      labels["com.supabase.cli.project"] === PROJECT_ID ||
      name.startsWith("supabase_") && name.endsWith(expectedSuffix)
    );
  });
}

function dockerJson(args, options = {}) {
  const result = runCommand("docker", args, options);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function localAnonKeyFromContainers() {
  const ids = inspectProjectContainers().map((container) => container.id);
  if (ids.length === 0) {
    throw new Error("Cannot inspect a public key without running containers.");
  }

  const containers = dockerJson(["inspect", ...ids]);
  const values = new Set();
  for (const container of containers) {
    for (const entry of container.Config?.Env ?? []) {
      const separator = entry.indexOf("=");
      const name = separator >= 0 ? entry.slice(0, separator) : entry;
      const value = separator >= 0 ? entry.slice(separator + 1) : "";
      if ((name === "SUPABASE_ANON_KEY" || name === "ANON_KEY") && value) {
        values.add(value);
      }
    }
  }

  if (values.size !== 1) {
    throw new Error(
      "Running local services did not expose one consistent anonymous public key."
    );
  }

  return [...values][0];
}

export function networkExists() {
  return runCommand("docker", ["network", "inspect", NETWORK_NAME], {
    allowFailure: true
  }).status === 0;
}

export function ensureLocalNetwork() {
  if (!networkExists()) {
    runCommand("docker", [
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      NETWORK_NAME
    ]);
  }

  const [network] = dockerJson(["network", "inspect", NETWORK_NAME]);
  const binding =
    network?.Options?.["com.docker.network.bridge.host_binding_ipv4"];

  if (network?.Driver !== "bridge" || binding !== "127.0.0.1") {
    throw new Error(
      `Docker network ${NETWORK_NAME} does not enforce the localhost binding contract.`
    );
  }
}

export function inspectProjectContainers() {
  const ids = runCommand("docker", ["ps", "-aq"]).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  const containers = selectProjectContainers(dockerJson(["inspect", ...ids]));
  return containers.map((container) => {
    const published = [];
    for (const bindings of Object.values(container.NetworkSettings?.Ports ?? {})) {
      for (const binding of bindings ?? []) {
        published.push({
          hostIp: binding.HostIp,
          hostPort: Number(binding.HostPort)
        });
      }
    }

    return {
      id: container.Id,
      name: String(container.Name ?? "").replace(/^\//, ""),
      running: container.State?.Running === true,
      networks: Object.keys(container.NetworkSettings?.Networks ?? {}),
      published
    };
  });
}

export function assertNoUnsafeProjectBindings(
  containers = inspectProjectContainers()
) {
  const running = containers.filter((container) => container.running);
  const bindings = running.flatMap((container) =>
    container.published.map((binding) => ({
      ...binding,
      service: container.name
    }))
  );
  for (const binding of bindings) {
    if (
      binding.hostIp !== "127.0.0.1" ||
      !EXPECTED_PORTS.has(binding.hostPort)
    ) {
      throw new Error(
        `Unsafe Docker binding detected for ${binding.service} on ${binding.hostIp || "<empty>"}:${binding.hostPort}.`
      );
    }
  }

  for (const container of running) {
    if (!container.networks.includes(NETWORK_NAME)) {
      throw new Error(
        `Project container ${container.name} is outside ${NETWORK_NAME}.`
      );
    }
  }

  return running;
}

export function assertLocalBindings(containers = inspectProjectContainers()) {
  const running = assertNoUnsafeProjectBindings(containers);
  const actualPorts = new Set(
    running.flatMap((container) =>
      container.published.map((binding) => binding.hostPort)
    )
  );

  if (running.length === 0) {
    throw new Error("The local Supabase stack is not running.");
  }

  for (const port of EXPECTED_PORTS) {
    if (!actualPorts.has(port)) {
      throw new Error(`Expected local Supabase port ${port} is not published.`);
    }
  }

  return running;
}

export function forceRemoveProjectContainers() {
  const containers = inspectProjectContainers();
  if (containers.length > 0) {
    runCommand("docker", ["rm", "-f", ...containers.map((item) => item.id)], {
      allowFailure: true
    });
  }
  const remaining = inspectProjectContainers();
  if (remaining.length > 0) {
    throw new Error("Fail-closed cleanup left project containers behind.");
  }
}

export function printSafeStatus(containers = inspectProjectContainers()) {
  const running = containers.filter((container) => container.running);
  if (running.length === 0) {
    console.log("Local Supabase stack: stopped");
    return;
  }

  console.log("Local Supabase stack: running");
  for (const container of running.sort((a, b) => a.name.localeCompare(b.name))) {
    const ports = container.published
      .sort((a, b) => a.hostPort - b.hostPort)
      .map((binding) => `${binding.hostIp}:${binding.hostPort}`)
      .join(", ");
    console.log(`- ${container.name}: ${ports || "no published port"}`);
  }
}

export function localCliPath(repoRoot) {
  return path.join(repoRoot, "node_modules", ".bin", "supabase");
}

export function runSupabase(repoRoot, args, options = {}) {
  return runCommand(localCliPath(repoRoot), args, {
    cwd: repoRoot,
    ...options
  });
}

export function runSupabaseAsync(repoRoot, args, options = {}) {
  return runCommandAsync(localCliPath(repoRoot), args, {
    cwd: repoRoot,
    ...options
  });
}

export async function writeLocalProfile(repoRoot, startOutput = "") {
  const status = runSupabase(repoRoot, ["status", "-o", "env"]);
  const parsed = {
    ...parseEnv(status.stdout),
    ...parseEnv(startOutput)
  };
  const url = parsed.API_URL;
  const anonKey =
    parsed.ANON_KEY ?? parsed.PUBLISHABLE_KEY ?? localAnonKeyFromContainers();

  if (url !== "http://127.0.0.1:54321" || !anonKey) {
    throw new Error(
      `Supabase status did not return the expected local API profile (available keys: ${Object.keys(parsed).sort().join(", ")}).`
    );
  }

  const destination = path.join(repoRoot, ".env.supabase.local");
  const temporary = `${destination}.tmp-${process.pid}`;
  const contents = `SUPABASE_URL=${JSON.stringify(url)}\nSUPABASE_ANON_KEY=${JSON.stringify(anonKey)}\n`;

  await writeFile(temporary, contents, { mode: 0o600, flag: "wx" });
  await chmod(temporary, 0o600);
  await rename(temporary, destination);
  await chmod(destination, 0o600);
}

export async function removeLocalProfile(repoRoot) {
  await unlink(path.join(repoRoot, ".env.supabase.local")).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

export async function removeNetworkIfUnused() {
  if (!networkExists()) {
    return;
  }

  const containers = inspectProjectContainers();
  if (containers.length > 0) {
    throw new Error(
      `Cannot remove ${NETWORK_NAME} while project containers still exist.`
    );
  }

  runCommand("docker", ["network", "rm", NETWORK_NAME]);
}

export function sanitizeCliFailure(error) {
  const combined = `${error.stderr ?? ""}\n${error.stdout ?? ""}`;
  const safeLines = combined
    .split("\n")
    .filter(Boolean)
    .filter(
      (line) =>
        !/(KEY|SECRET|PASSWORD|TOKEN|JWT|DB_URL|API_URL|DATABASE_URL)/i.test(
          line
        )
    )
    .slice(-20);

  return safeLines.join("\n") || error.message;
}
