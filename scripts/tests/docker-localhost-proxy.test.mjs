import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDatabaseCreateObservation,
  assertLocalhostPortBindings,
  isContainerCreateRequest,
  isExpectedDatabaseCreate,
  localhostContainerCreateBody,
  looksLikeContainerCreateRequest
} from "../lib/docker-localhost-proxy.mjs";
import {
  NETWORK_NAME,
  PROJECT_ID,
  selectProjectContainers
} from "../lib/supabase-local.mjs";

test("accepts versioned and unversioned Docker create paths", () => {
  assert.equal(isContainerCreateRequest("POST", "/containers/create?name=db"), true);
  assert.equal(isContainerCreateRequest("POST", "/v1.47/containers/create?name=db"), true);
  assert.equal(isContainerCreateRequest("GET", "/v1.47/containers/create"), false);
  assert.equal(
    looksLikeContainerCreateRequest("POST", "/unexpected/containers/create"),
    true
  );
  assert.equal(
    isContainerCreateRequest("POST", "/unexpected/containers/create"),
    false
  );
});

test("rewrites every published HostIp to localhost", () => {
  const source = Buffer.from(JSON.stringify({
    HostConfig: {
      PortBindings: {
        "5432/tcp": [{ HostIp: "" }, { HostIp: "0.0.0.0" }],
        "8000/tcp": [{ HostIp: "::" }]
      }
    }
  }));
  const rewritten = JSON.parse(
    localhostContainerCreateBody(source, "/var/run/docker.sock").toString("utf8")
  );
  assert.deepEqual(rewritten.HostConfig.PortBindings, {
    "5432/tcp": [{ HostIp: "127.0.0.1" }, { HostIp: "127.0.0.1" }],
    "8000/tcp": [{ HostIp: "127.0.0.1" }]
  });
});

test("rejects unsafe or malformed rewritten bindings", () => {
  for (const hostIp of ["", "0.0.0.0", "::", "192.0.2.1"]) {
    assert.throws(
      () => assertLocalhostPortBindings({
        HostConfig: { PortBindings: { "5432/tcp": [{ HostIp: hostIp }] } }
      }),
      /unsafe Docker HostIp/
    );
  }
  assert.throws(
    () => localhostContainerCreateBody(
      Buffer.from('{"secret":"do-not-print",'),
      "/var/run/docker.sock"
    ),
    (error) => !error.message.includes("do-not-print") && /malformed/.test(error.message)
  );
});

test("requires an observed DB create for reset", () => {
  assert.throws(
    () => assertDatabaseCreateObservation({ required: true, observed: false, rejected: false }),
    /did not observe/
  );
  assert.doesNotThrow(() =>
    assertDatabaseCreateObservation({ required: true, observed: true, rejected: false })
  );
  assert.throws(
    () => assertDatabaseCreateObservation({ required: true, observed: true, rejected: true }),
    /rejected/
  );
});

test("recognizes the expected Supabase DB create without logging its body", () => {
  assert.equal(
    isExpectedDatabaseCreate(
      "/v1.47/containers/create?name=supabase_db_Where-to-Visit",
      { Labels: {} }
    ),
    true
  );
  assert.equal(
    isExpectedDatabaseCreate("/containers/create?name=other", {
      Labels: {
        "com.supabase.cli.project": PROJECT_ID,
        "com.supabase.cli.service": "db"
      }
    }),
    true
  );
});

test("detects project containers by network, label, or Supabase name", () => {
  const containers = [
    {
      Id: "network",
      Name: "/other",
      Config: { Labels: {} },
      NetworkSettings: { Networks: { [NETWORK_NAME]: {} } }
    },
    {
      Id: "label",
      Name: "/other-label",
      Config: { Labels: { "com.supabase.cli.project": PROJECT_ID } },
      NetworkSettings: { Networks: { bridge: {} } }
    },
    {
      Id: "name",
      Name: "/supabase_db_Where-to-Visit",
      Config: { Labels: {} },
      NetworkSettings: { Networks: { bridge: {} } }
    },
    {
      Id: "unrelated",
      Name: "/unrelated",
      Config: { Labels: {} },
      NetworkSettings: { Networks: { bridge: {} } }
    }
  ];
  assert.deepEqual(
    selectProjectContainers(containers).map((item) => item.Id).sort(),
    ["label", "name", "network"]
  );
});
