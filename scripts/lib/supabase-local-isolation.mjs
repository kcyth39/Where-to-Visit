import net from "node:net";
import path from "node:path";

import { runCommand } from "./command.mjs";

export const PROFILE_RESOURCE_STATES = Object.freeze({
  TARGET_OWNED_EXISTING: "TARGET_OWNED_EXISTING",
  TARGET_OWNED_ABSENT: "TARGET_OWNED_ABSENT",
  FOREIGN_OWNED: "FOREIGN_OWNED",
  UNKNOWN_OWNER: "UNKNOWN_OWNER"
});

function dockerContextEnvironment() {
  const environment = { ...process.env };
  delete environment.DOCKER_HOST;
  delete environment.DOCKER_CONTEXT;
  delete environment.DOCKER_TLS_VERIFY;
  delete environment.DOCKER_CERT_PATH;
  return environment;
}

let pinnedLocalDockerEndpoint = null;

export function assertLocalUnixDockerEndpoint(endpoint) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("unix://") ||
    !path.isAbsolute(endpoint.slice("unix://".length))
  ) {
    throw new Error("The effective Docker endpoint must be an absolute local Unix socket.");
  }
  return endpoint;
}

function currentDockerEndpoint() {
  const result = runCommand("docker", [
    "context",
    "inspect",
    "--format",
    "{{json .Endpoints.docker.Host}}"
  ], { env: dockerContextEnvironment() });
  return assertLocalUnixDockerEndpoint(JSON.parse(result.stdout.trim()));
}

export function verifiedLocalDockerEndpoint() {
  const current = currentDockerEndpoint();
  if (pinnedLocalDockerEndpoint === null) {
    pinnedLocalDockerEndpoint = current;
  } else if (current !== pinnedLocalDockerEndpoint) {
    throw new Error("The effective local Docker endpoint changed during the operation.");
  }
  return pinnedLocalDockerEndpoint;
}

export function runLocalDockerCommand(args, options = {}) {
  const endpoint = verifiedLocalDockerEndpoint();
  return runCommand("docker", args, {
    ...options,
    env: { ...dockerContextEnvironment(), DOCKER_HOST: endpoint }
  });
}

function dockerJson(args, { allowFailure = false } = {}) {
  const result = runLocalDockerCommand(args, { allowFailure });
  if (result.status !== 0 || !result.stdout.trim()) {
    return null;
  }
  return JSON.parse(result.stdout);
}

function normalizedContainer(container) {
  const published = [];
  for (const bindings of Object.values(container.NetworkSettings?.Ports ?? {})) {
    for (const binding of bindings ?? []) {
      published.push({ hostIp: binding.HostIp, hostPort: Number(binding.HostPort) });
    }
  }
  return {
    id: container.Id,
    name: String(container.Name ?? "").replace(/^\//, ""),
    projectId: container.Config?.Labels?.["com.supabase.cli.project"] ?? null,
    service: container.Config?.Labels?.["com.supabase.cli.service"] ?? null,
    networks: Object.keys(container.NetworkSettings?.Networks ?? {}),
    mounts: (container.Mounts ?? []).map((mount) => ({
      type: mount.Type ?? null,
      source: mount.Source ?? null,
      destination: mount.Destination ?? null,
      readWrite: mount.RW === true
    })),
    published
  };
}

export function selectProfileContainers(containers, profile) {
  const suffix = `_${profile.containerSuffix}`;
  return containers.filter((container) =>
    container.projectId === profile.projectId ||
    container.networks.includes(profile.networkName) ||
    container.name.startsWith("supabase_") && container.name.endsWith(suffix)
  );
}

export function selectProfileVolumes(volumes, profile) {
  const suffix = `_${profile.containerSuffix}`;
  return volumes.filter((volume) =>
    volume.Labels?.["com.supabase.cli.project"] === profile.projectId ||
    volume.Name.startsWith("supabase_") && volume.Name.endsWith(suffix)
  );
}

function expectedSnippetsPath(profile) {
  return path.join(profile.workdir, "supabase", "snippets");
}

export function classifyProfileResources({
  profile,
  containers,
  network,
  volumes,
  conflictingPorts = []
}) {
  const selected = selectProfileContainers(containers, profile);
  const selectedVolumes = selectProfileVolumes(volumes, profile);
  if (conflictingPorts.length > 0) {
    return { state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED, reason: "PORT_CONFLICT" };
  }
  if (selected.length === 0) {
    if (network === null && selectedVolumes.length === 0) {
      return { state: PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT };
    }
    return { state: PROFILE_RESOURCE_STATES.UNKNOWN_OWNER, reason: "ORPHANED_RESOURCE" };
  }

  const expectedSuffix = `_${profile.containerSuffix}`;
  if (selected.some((container) =>
    container.projectId !== profile.projectId ||
    !container.name.endsWith(expectedSuffix) ||
    !container.networks.includes(profile.networkName)
  )) {
    return { state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED, reason: "IDENTITY_MISMATCH" };
  }
  const studios = selected.filter((container) =>
    container.service === "studio" || container.name === `supabase_studio_${profile.containerSuffix}`
  );
  const snippets = expectedSnippetsPath(profile);
  if (
    studios.length !== 1 ||
    !studios[0].mounts.some((mount) =>
      mount.type === "bind" &&
      mount.source === snippets &&
      mount.destination === snippets &&
      mount.readWrite
    )
  ) {
    return { state: PROFILE_RESOURCE_STATES.UNKNOWN_OWNER, reason: "WORKDIR_MISMATCH" };
  }
  if (network === null) {
    return { state: PROFILE_RESOURCE_STATES.UNKNOWN_OWNER, reason: "NETWORK_MISSING" };
  }
  const hostBinding = network.Options?.["com.docker.network.bridge.host_binding_ipv4"];
  if (network.Driver !== "bridge" || hostBinding !== "127.0.0.1") {
    return { state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED, reason: "NETWORK_BINDING" };
  }
  if (profile.id !== "n6") {
    if (
      network.Labels?.["wtv.local.profile"] !== profile.id ||
      network.Labels?.["wtv.local.project"] !== profile.projectId
    ) {
      return { state: PROFILE_RESOURCE_STATES.UNKNOWN_OWNER, reason: "NETWORK_MARKER" };
    }
  }
  if (selectedVolumes.some((volume) =>
    volume.Labels?.["com.supabase.cli.project"] !== profile.projectId
  )) {
    return { state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED, reason: "VOLUME_MARKER" };
  }
  for (const container of selected) {
    for (const binding of container.published) {
      if (
        binding.hostIp !== "127.0.0.1" ||
        !profile.expectedPublishedPorts.includes(binding.hostPort)
      ) {
        return { state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED, reason: "UNSAFE_BINDING" };
      }
    }
  }
  const actualPorts = new Set(selected.flatMap((container) =>
    container.published.map((binding) => binding.hostPort)
  ));
  if (profile.expectedPublishedPorts.some((port) => !actualPorts.has(port))) {
    return { state: PROFILE_RESOURCE_STATES.UNKNOWN_OWNER, reason: "PORT_SET_INCOMPLETE" };
  }
  return {
    state: PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING,
    containerIds: selected.map((container) => container.id).sort(),
    volumeNames: selectedVolumes.map((volume) => volume.Name).sort()
  };
}

export function inspectDockerProfileResources(profile) {
  const ids = runLocalDockerCommand(["ps", "-aq"]).stdout.trim().split("\n").filter(Boolean);
  const containers = ids.length === 0
    ? []
    : dockerJson(["inspect", ...ids]).map(normalizedContainer);
  const network = dockerJson(["network", "inspect", profile.networkName], {
    allowFailure: true
  })?.[0] ?? null;
  const volumeNames = runLocalDockerCommand(["volume", "ls", "-q"])
    .stdout.trim().split("\n").filter(Boolean);
  const volumes = volumeNames.length === 0
    ? []
    : dockerJson(["volume", "inspect", ...volumeNames]);
  const selected = selectProfileContainers(containers, profile);
  const selectedIds = new Set(selected.map((container) => container.id));
  const conflictingPorts = containers
    .filter((container) => !selectedIds.has(container.id))
    .flatMap((container) => container.published)
    .filter((binding) => profile.allReservedPorts.includes(binding.hostPort));
  return { containers, network, volumes, conflictingPorts };
}

async function probePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });
}

export async function preflightProfileResources(profile, {
  probe = probePort,
  inspect = inspectDockerProfileResources
} = {}) {
  const resources = inspect(profile);
  const classification = classifyProfileResources({ profile, ...resources });
  const portsToProbe = classification.state === PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT
    ? profile.allReservedPorts
    : classification.state === PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
      ? profile.allReservedPorts.filter((port) =>
          !profile.expectedPublishedPorts.includes(port)
        )
      : [];
  for (const port of portsToProbe) {
      try {
        await probe(port);
      } catch {
        return {
          state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED,
          reason: `HOST_PORT_${port}_OCCUPIED`
        };
      }
  }
  return classification;
}

export function assertProfileMayProceed(classification) {
  if (
    classification.state !== PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT &&
    classification.state !== PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
  ) {
    throw new Error(
      `Local Supabase profile ownership gate failed: ${classification.state}/${classification.reason ?? "UNSPECIFIED"}`
    );
  }
  return classification;
}

export function captureProfileSnapshot(profile) {
  const resources = inspectDockerProfileResources(profile);
  const selected = selectProfileContainers(resources.containers, profile);
  const selectedVolumes = selectProfileVolumes(resources.volumes, profile);
  return {
    containerIds: selected.map((container) => container.id).sort(),
    volumeNames: selectedVolumes.map((volume) => volume.Name).sort(),
    networkExisted: resources.network !== null
  };
}

export function planAttemptCleanup(profile, before, after) {
  const selected = selectProfileContainers(after.containers, profile);
  const selectedVolumes = selectProfileVolumes(after.volumes, profile);
  const newContainers = selected.filter((container) =>
    !before.containerIds.includes(container.id)
  );
  const newVolumes = selectedVolumes.filter((volume) =>
    !before.volumeNames.includes(volume.Name)
  );
  const expectedSuffix = `_${profile.containerSuffix}`;
  if (newContainers.some((container) =>
    container.projectId !== profile.projectId ||
    !container.name.endsWith(expectedSuffix) ||
    !container.networks.includes(profile.networkName)
  )) {
    throw new Error("Attempt cleanup preserved resources because ownership is not provable.");
  }
  if (newVolumes.some((volume) =>
    volume.Labels?.["com.supabase.cli.project"] !== profile.projectId
  )) {
    throw new Error("Attempt cleanup preserved volumes because ownership is not provable.");
  }
  let removeNetwork = false;
  if (!before.networkExisted && after.network !== null) {
    const newContainerIds = new Set(newContainers.map((container) => container.id));
    const attachedContainerIds = Object.keys(after.network.Containers ?? {});
    if (
      after.network.Labels?.["wtv.local.profile"] !== profile.id ||
      after.network.Labels?.["wtv.local.project"] !== profile.projectId ||
      attachedContainerIds.some((containerId) => !newContainerIds.has(containerId))
    ) {
      throw new Error("Attempt cleanup preserved the network because ownership is not provable.");
    }
    removeNetwork = true;
  }
  return {
    containerIds: newContainers.map((container) => container.id),
    volumeNames: newVolumes.map((volume) => volume.Name),
    removeNetwork
  };
}

export function ensureProfileNetwork(profile) {
  const existing = dockerJson(["network", "inspect", profile.networkName], {
    allowFailure: true
  })?.[0] ?? null;
  if (existing === null) {
    runLocalDockerCommand([
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      "--label",
      `wtv.local.profile=${profile.id}`,
      "--label",
      `wtv.local.project=${profile.projectId}`,
      profile.networkName
    ]);
  }
  const network = dockerJson(["network", "inspect", profile.networkName])?.[0];
  if (
    network?.Driver !== "bridge" ||
    network?.Options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1" ||
    network?.Labels?.["wtv.local.profile"] !== profile.id ||
    network?.Labels?.["wtv.local.project"] !== profile.projectId
  ) {
    throw new Error("Selected profile network ownership validation failed.");
  }
}

export function cleanupAttemptResources(profile, before) {
  const after = inspectDockerProfileResources(profile);
  const plan = planAttemptCleanup(profile, before, after);
  if (plan.containerIds.length > 0) {
    runLocalDockerCommand(["rm", "-f", ...plan.containerIds]);
  }
  if (plan.volumeNames.length > 0) {
    runLocalDockerCommand(["volume", "rm", ...plan.volumeNames]);
  }
  if (plan.removeNetwork) {
    const network = dockerJson(["network", "inspect", profile.networkName])?.[0];
    if (
      network?.Labels?.["wtv.local.profile"] !== profile.id ||
      network?.Labels?.["wtv.local.project"] !== profile.projectId ||
      Object.keys(network?.Containers ?? {}).length !== 0
    ) {
      throw new Error("Attempt cleanup preserved the network after container cleanup.");
    }
    runLocalDockerCommand(["network", "rm", profile.networkName]);
  }
}

export function safeProfileSummary(profile, classification) {
  return [
    `Local profile: ${profile.id}`,
    `Project: ${profile.projectId}`,
    `Network: ${profile.networkName}`,
    `Reserved ports: ${profile.allReservedPorts.join(",")}`,
    `Expected published ports: ${profile.expectedPublishedPorts.join(",")}`,
    `Ownership: ${classification.state}`
  ].join("\n");
}
