import { chmod, mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { runCommand } from "./command.mjs";

function dockerSocketPath() {
  const result = runCommand("docker", [
    "context",
    "inspect",
    "--format",
    "{{json .Endpoints.docker.Host}}"
  ]);
  const endpoint = JSON.parse(result.stdout.trim());
  if (typeof endpoint !== "string" || !endpoint.startsWith("unix://")) {
    throw new Error("The active Docker context must use a local Unix socket.");
  }
  return endpoint.slice("unix://".length);
}

const CONTAINER_CREATE_PATH = /^\/(?:v[0-9.]+\/)?containers\/create(?:\?|$)/;

export function isContainerCreateRequest(method, url) {
  return method === "POST" && CONTAINER_CREATE_PATH.test(url ?? "");
}

export function looksLikeContainerCreateRequest(method, url) {
  return method === "POST" && (url ?? "").includes("containers/create");
}

export function assertLocalhostPortBindings(payload) {
  const bindings = payload.HostConfig?.PortBindings ?? {};
  for (const portBindings of Object.values(bindings)) {
    if (!Array.isArray(portBindings)) {
      throw new Error("invalid Docker port binding structure");
    }
    for (const binding of portBindings) {
      if (binding?.HostIp !== "127.0.0.1") {
        throw new Error("unsafe Docker HostIp after localhost rewrite");
      }
    }
  }
}

export function localhostContainerCreateBody(body, realSocket) {
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("malformed Docker container create JSON");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("invalid Docker container create payload");
  }
  const bindings = payload.HostConfig?.PortBindings ?? {};

  for (const portBindings of Object.values(bindings)) {
    if (!Array.isArray(portBindings)) {
      throw new Error("invalid Docker port binding structure");
    }
    for (const binding of portBindings) {
      if (!binding || typeof binding !== "object") {
        throw new Error("invalid Docker port binding entry");
      }
      binding.HostIp = "127.0.0.1";
    }
  }
  assertLocalhostPortBindings(payload);

  const binds = payload.HostConfig?.Binds ?? [];
  payload.HostConfig.Binds = binds.map((bind) => {
    const parts = bind.split(":");
    if (parts[1] === "/var/run/docker.sock") {
      parts[0] = realSocket;
    }
    return parts.join(":");
  });

  for (const mount of payload.HostConfig?.Mounts ?? []) {
    if (mount.Target === "/var/run/docker.sock") {
      mount.Source = realSocket;
    }
  }

  return Buffer.from(JSON.stringify(payload));
}

export function isExpectedDatabaseCreate(url, payload) {
  const parsed = new URL(url ?? "", "http://docker.local");
  const name = parsed.searchParams.get("name") ?? "";
  const labels = payload?.Labels ?? {};
  return (
    name === "supabase_db_Where-to-Visit" ||
    labels["com.supabase.cli.project"] === "Where-to-Visit" &&
      (labels["com.supabase.cli.service"] === "db" || name.startsWith("supabase_db_"))
  );
}

export function assertDatabaseCreateObservation({ required, observed, rejected }) {
  if (required && !observed) {
    throw new Error("Docker proxy did not observe the expected local DB container create");
  }
  if (rejected) {
    throw new Error("Docker proxy rejected a container create request");
  }
}

function responseHeaders(response) {
  const headers = [];
  for (const [name, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.push(`${name}: ${item}`);
      }
    } else if (value !== undefined) {
      headers.push(`${name}: ${value}`);
    }
  }
  return headers;
}

function forwardRequest(realSocket, clientRequest, clientResponse, body) {
  const headers = { ...clientRequest.headers };
  if (body) {
    headers["content-length"] = String(body.length);
    delete headers["transfer-encoding"];
  }

  const targetRequest = http.request({
    socketPath: realSocket,
    path: clientRequest.url,
    method: clientRequest.method,
    headers
  });

  targetRequest.on("response", (targetResponse) => {
    clientResponse.writeHead(targetResponse.statusCode ?? 500, targetResponse.headers);
    targetResponse.pipe(clientResponse);
  });
  targetRequest.on("upgrade", (targetResponse, targetSocket, head) => {
    const statusLine = `HTTP/${targetResponse.httpVersion} ${targetResponse.statusCode} ${targetResponse.statusMessage}\r\n`;
    clientRequest.socket.write(
      `${statusLine}${responseHeaders(targetResponse).join("\r\n")}\r\n\r\n`
    );
    if (head.length > 0) {
      clientRequest.socket.write(head);
    }
    targetSocket.pipe(clientRequest.socket);
    clientRequest.socket.pipe(targetSocket);
  });
  targetRequest.on("error", (error) => {
    if (!clientResponse.headersSent) {
      clientResponse.writeHead(502, { "content-type": "text/plain" });
    }
    clientResponse.end(`Docker proxy error: ${error.message}`);
  });

  if (body) {
    targetRequest.end(body);
  } else {
    clientRequest.pipe(targetRequest);
  }
}

export async function createDockerLocalhostProxy(options = {}) {
  const realSocket = dockerSocketPath();
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "where-to-visit-docker-proxy-")
  );
  const socketPath = path.join(directory, "docker.sock");

  let databaseCreateObserved = false;
  let rejectionReason = null;

  function rejectCreate(response, message) {
    rejectionReason = message;
    options.onReject?.(new Error(message));
    response.writeHead(400, { "content-type": "text/plain" });
    response.end(`Docker proxy rejected container create: ${message}`);
  }

  const server = http.createServer(async (request, response) => {
    if (looksLikeContainerCreateRequest(request.method, request.url) &&
        !isContainerCreateRequest(request.method, request.url)) {
      rejectCreate(response, "unrecognized Docker container create request path");
      return;
    }

    if (!isContainerCreateRequest(request.method, request.url)) {
      forwardRequest(realSocket, request, response);
      return;
    }

    try {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks);
      const body = localhostContainerCreateBody(input, realSocket);
      const rewrittenPayload = JSON.parse(body.toString("utf8"));
      if (isExpectedDatabaseCreate(request.url, rewrittenPayload)) {
        databaseCreateObserved = true;
      }
      forwardRequest(realSocket, request, response, body);
    } catch (error) {
      rejectCreate(response, error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  await chmod(socketPath, 0o600);

  return {
    dockerHost: `unix://${socketPath}`,
    assertExpectedDatabaseCreateObserved() {
      assertDatabaseCreateObservation({
        required: options.requireDatabaseCreate,
        observed: databaseCreateObserved,
        rejected: rejectionReason !== null
      });
    },
    observation() {
      return { databaseCreateObserved, rejected: rejectionReason !== null };
    },
    async close() {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await rm(directory, { recursive: true, force: true });
    }
  };
}
