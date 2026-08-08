import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isExpectedDatabaseCreate } from "../lib/docker-localhost-proxy.mjs";
import {
  assertLocalUnixDockerEndpoint,
  classifyProfileResources,
  planAttemptCleanup,
  preflightProfileResources,
  PROFILE_RESOURCE_STATES,
  safeProfileSummary,
  selectProfileContainers,
  selectProfileVolumes
} from "../lib/supabase-local-isolation.mjs";
import {
  loadLocalProfileDescriptor,
  materializeGeneratedWorkdir,
  parseLocalProfileSelector,
  profileSupabaseArgs,
  renderProfileConfig,
  validateGeneratedWorkdir
} from "../lib/supabase-local-profile.mjs";
import {
  assertN9TestFilePaths,
  assertN9Stage1PgTapFilePaths,
  assertN9Stage1QueryFilePath,
  N9_STAGE1_PGTAP_FILES,
  loadProfileEnv,
  localCliEnvironment,
  parseLocalStatusCredentials,
  parseGeneratedAuthEnabled,
  parseN9WrapperArguments,
  publishOrCorrelateProfileEnv,
  readGeneratedAuthEnabled,
  retrieveLocalStatusCredentials,
  startStack,
  statusStack,
  stopStack,
  validateAuthDisabledLocalRuntimeHealth,
  validateLocalDataApiCredential,
  validateProfileHealth,
  validateN9CommandArgs
} from "../supabase-local-n9-stage1.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const descriptor = await loadLocalProfileDescriptor(repoRoot);
const n6 = descriptor.profiles.n6;
const n9 = descriptor.profiles["n9-stage1"];

test("Docker endpoint guard accepts only an absolute local Unix socket", () => {
  assert.equal(
    assertLocalUnixDockerEndpoint("unix:///Users/test/.docker/run/docker.sock"),
    "unix:///Users/test/.docker/run/docker.sock"
  );
  for (const endpoint of [
    "tcp://127.0.0.1:2375",
    "ssh://remote/docker",
    "unix://relative.sock",
    ""
  ]) {
    assert.throws(() => assertLocalUnixDockerEndpoint(endpoint));
  }
});

function validN9Resources() {
  const snippets = path.join(n9.workdir, "supabase", "snippets");
  const containers = [
    {
      id: "studio",
      name: "supabase_studio_Where-to-Visit-N9-Stage1",
      projectId: n9.projectId,
      service: "studio",
      networks: [n9.networkName],
      mounts: [{
        type: "bind",
        source: snippets,
        destination: snippets,
        readWrite: true
      }],
      published: [{ hostIp: "127.0.0.1", hostPort: n9.ports.studio }]
    },
    ...[
      ["kong", "api"],
      ["db", "db"],
      ["inbucket", "mailpit"],
      ["analytics", "analytics"]
    ].map(([service, port]) => ({
      id: service,
      name: `supabase_${service}_Where-to-Visit-N9-Stage1`,
      projectId: n9.projectId,
      service,
      networks: [n9.networkName],
      mounts: [],
      published: [{ hostIp: "127.0.0.1", hostPort: n9.ports[port] }]
    }))
  ];
  return {
    containers,
    network: {
      Driver: "bridge",
      Options: { "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1" },
      Labels: {
        "wtv.local.profile": n9.id,
        "wtv.local.project": n9.projectId
      },
      Containers: {}
    },
    volumes: [{
      Name: "supabase_db_Where-to-Visit-N9-Stage1",
      Labels: { "com.supabase.cli.project": n9.projectId }
    }],
    conflictingPorts: []
  };
}

function validN6Resources() {
  const snippets = path.join(n6.workdir, "supabase", "snippets");
  return {
    containers: [
      {
        id: "n6-studio",
        name: "supabase_studio_Where-to-Visit",
        projectId: n6.projectId,
        service: "studio",
        networks: [n6.networkName],
        mounts: [{
          type: "bind",
          source: snippets,
          destination: snippets,
          readWrite: true
        }],
        published: [{ hostIp: "127.0.0.1", hostPort: n6.ports.studio }]
      },
      ...[
        ["kong", "api"],
        ["db", "db"],
        ["inbucket", "mailpit"],
        ["analytics", "analytics"]
      ].map(([service, port]) => ({
        id: `n6-${service}`,
        name: `supabase_${service}_Where-to-Visit`,
        projectId: n6.projectId,
        service,
        networks: [n6.networkName],
        mounts: [],
        published: [{ hostIp: "127.0.0.1", hostPort: n6.ports[port] }]
      }))
    ],
    network: {
      Driver: "bridge",
      Options: { "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1" },
      Labels: {},
      Containers: {}
    },
    volumes: [{
      Name: "supabase_db_Where-to-Visit",
      Labels: { "com.supabase.cli.project": n6.projectId }
    }],
    conflictingPorts: []
  };
}

test("descriptor preserves N6 and fixes the exact bounded N9 profile", () => {
  assert.equal(descriptor.defaultProfile, "n6");
  assert.equal(n6.projectId, "Where-to-Visit");
  assert.equal(n6.networkName, "where-to-visit-supabase-local");
  assert.deepEqual(n6.allReservedPorts, [54320, 54321, 54322, 54323, 54324, 54327, 54329]);
  assert.deepEqual(n6.expectedPublishedPorts, [54321, 54322, 54323, 54324, 54327]);
  assert.equal(n6.envFile, ".env.supabase.local");
  assert.equal(n9.projectId, "Where-to-Visit-N9-Stage1");
  assert.equal(n9.networkName, "where-to-visit-n9-stage1-supabase-local");
  assert.deepEqual(n9.allReservedPorts, [55320, 55321, 55322, 55323, 55324, 55327, 55329]);
  assert.deepEqual(n9.expectedPublishedPorts, [55321, 55322, 55323, 55324, 55327]);
  assert.equal(n9.envFile, ".env.supabase.n9-stage1.local");
  assert.deepEqual(
    n6.allReservedPorts.filter((port) => n9.allReservedPorts.includes(port)),
    []
  );
});

for (const overlapPort of ["shadow", "pooler"]) {
  test(`descriptor rejects cross-profile overlap on ${overlapPort}`, async () => {
    const temporary = await mkdtemp("/private/tmp/n9-profile-overlap-test-");
    try {
      await mkdir(path.join(temporary, "config"));
      const raw = JSON.parse(await readFile(
        path.join(repoRoot, "config", "supabase-local-profiles.json"),
        "utf8"
      ));
      raw.profiles["n9-stage1"].ports[overlapPort] = raw.profiles.n6.ports[overlapPort];
      await writeFile(
        path.join(temporary, "config", "supabase-local-profiles.json"),
        `${JSON.stringify(raw, null, 2)}\n`
      );
      await assert.rejects(loadLocalProfileDescriptor(temporary), /overlap/);
    } finally {
      await rm(temporary, { recursive: true });
    }
  });
}

test("profile selector is explicit, bounded, and non-fallback", () => {
  assert.deepEqual(parseLocalProfileSelector(["stack", "status"]), {
    profileId: "n6",
    args: ["stack", "status"],
    explicit: false
  });
  assert.deepEqual(
    parseLocalProfileSelector(["--profile", "n9-stage1", "stack", "status"]),
    { profileId: "n9-stage1", args: ["stack", "status"], explicit: true }
  );
  assert.throws(() => parseLocalProfileSelector(["--profile"]));
  assert.throws(() => parseLocalProfileSelector([
    "--profile", "n9-stage1", "--profile", "n6"
  ]));
  assert.throws(() => parseN9WrapperArguments(["stack", "status"]));
  assert.throws(() => parseN9WrapperArguments(["--profile", "n6", "stack", "status"]));
  assert.deepEqual(
    parseN9WrapperArguments(["--profile", "n9-stage1", "stack", "status"]),
    { kind: "stack", operation: "status", cliArgs: [] }
  );
});

test("N9 command scope rejects credentials and broad cleanup", () => {
  assert.throws(() => validateN9CommandArgs(["credential", "provision"]));
  assert.throws(() => validateN9CommandArgs(["--all"]));
  for (const args of [
    ["db", "reset", "--local", "--no-seed", "--workdir", "/tmp/other"],
    ["db", "reset", "--local", "--no-seed", "--workdir=/tmp/other"],
    ["migration", "list", "--local", "--project-id", "Where-to-Visit"],
    ["migration", "list", "--local", "--network-id=foreign"],
    ["migration", "list", "--local", "--db-url=postgresql://foreign"],
    ["test", "db", "--local", "supabase/tests/../../outside.sql"]
  ]) {
    assert.throws(() => validateN9CommandArgs(args));
  }
  assert.equal(
    validateN9CommandArgs(["db", "reset", "--local", "--no-seed"]).command,
    "db reset"
  );
});

test("N9 command scope fixes catalog query and pgTAP boundaries", async () => {
  assert.throws(() => validateN9CommandArgs(["db", "query", "--local"]));
  assert.throws(() => validateN9CommandArgs([
    "db", "query", "--local", "--file", "supabase/tests/other.sql"
  ]));
  assert.throws(() => validateN9CommandArgs(["test", "db", "--local"]));
  assert.throws(() => validateN9CommandArgs([
    "test", "db", "--local", "supabase/tests/adr6_data_preservation_test.sql"
  ]));
  assert.equal(
    validateN9CommandArgs([
      "test", "db", "--local", N9_STAGE1_PGTAP_FILES[0]
    ]).command,
    "test db"
  );
  assert.equal(
    validateN9CommandArgs([
      "test", "db", "--local", ...N9_STAGE1_PGTAP_FILES
    ]).command,
    "test db"
  );

  const temporary = await mkdtemp("/private/tmp/n9-query-scope-test-");
  try {
    const queryRoot = path.join(temporary, "supabase", "stage1", "queries");
    await mkdir(queryRoot, { recursive: true });
    const queryPath = path.join(queryRoot, "catalog.sql");
    await writeFile(
      queryPath,
      await readFile(path.join(repoRoot, "supabase/stage1/queries/catalog.sql"), "utf8")
    );
    const args = ["db", "query", "--local", "--file", "supabase/stage1/queries/catalog.sql"];
    assert.equal(validateN9CommandArgs(args).command, "db query");
    await assertN9Stage1QueryFilePath(args, temporary);
    await writeFile(queryPath, "DELETE FROM public.events;\n");
    await assert.rejects(assertN9Stage1QueryFilePath(args, temporary));
    await writeFile(
      queryPath,
      await readFile(path.join(repoRoot, "supabase/stage1/queries/catalog.sql"), "utf8")
    );
    await assertN9Stage1PgTapFilePaths(
      ["test", "db", "--local", ...N9_STAGE1_PGTAP_FILES],
      repoRoot
    );
    await symlink(queryPath, path.join(queryRoot, "link.sql"));
    await assert.rejects(assertN9Stage1QueryFilePath([
      "db", "query", "--local", "--file", "supabase/stage1/queries/link.sql"
    ], temporary));
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 child environment removes ambient credential and database controls", () => {
  const ambientNames = [
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_PROJECT_ID",
    "SUPABASE_PROJECT_REF",
    "NEXT_PUBLIC_SUPABASE_URL",
    "DATABASE_URL",
    "DIRECT_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "VERCEL_POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "DATABASE_POOLER_URL",
    "DB_READONLY_URL",
    "DATABASE_SSL_CA",
    "POSTGRES_SSL_CERT",
    "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL",
    "KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM",
    "PGHOST",
    "PGHOSTADDR",
    "PGPORT",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD",
    "PGSERVICE",
    "PGSERVICEFILE",
    "PGPASSFILE",
    "PGOPTIONS",
    "GH_TOKEN",
    "EXAMPLE_PRIVATE_KEY",
    "AWS_ACCESS_KEY_ID",
    "SSH_AUTH_SOCK",
    "UNRECOGNIZED_AMBIENT_VALUE"
  ];
  const baseEnvironment = Object.fromEntries(ambientNames.map((name) => [name, "hidden"]));
  baseEnvironment.PATH = "/usr/bin";
  baseEnvironment.LANG = "ja_JP.UTF-8";
  baseEnvironment.TMPDIR = "/private/tmp/";
  baseEnvironment.HOME = "/Users/test";
  baseEnvironment.USER = "test";
  baseEnvironment.SHELL = "/bin/bash";
  baseEnvironment.ORDINARY_CUSTOM_VALUE = "preserved";
  const environment = localCliEnvironment(
    { DOCKER_HOST: "unix:///private/tmp/n9.sock" },
    baseEnvironment
  );
  assert.deepEqual(environment, {
    PATH: "/usr/bin",
    LANG: "ja_JP.UTF-8",
    TMPDIR: "/private/tmp/",
    HOME: "/Users/test",
    USER: "test",
    SHELL: "/bin/bash",
    UNRECOGNIZED_AMBIENT_VALUE: "hidden",
    ORDINARY_CUSTOM_VALUE: "preserved",
    DOCKER_HOST: "unix:///private/tmp/n9.sock"
  });
  assert.throws(() => localCliEnvironment({ DOCKER_CONTEXT: "foreign" }, {}));
});

test("N9 test file paths are canonical, contained, regular, and non-symlink", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-test-path-test-");
  try {
    await mkdir(path.join(temporary, "supabase", "tests"), { recursive: true });
    const testFile = path.join(temporary, "supabase", "tests", "safe.sql");
    await writeFile(testFile, "select 1;\n");
    await assertN9TestFilePaths(
      ["test", "db", "--local", "supabase/tests/safe.sql"],
      temporary
    );
    await assert.rejects(assertN9TestFilePaths(
      ["test", "db", "--local", "supabase/tests/../../outside.sql"],
      temporary
    ));
    await symlink(testFile, path.join(temporary, "supabase", "tests", "link.sql"));
    await assert.rejects(assertN9TestFilePaths(
      ["test", "db", "--local", "supabase/tests/link.sql"],
      temporary
    ), /regular file/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("missing or mismatched N9 profile env fails before runtime use", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-env-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  try {
    await assert.rejects(loadProfileEnv(profile), /PROFILE_SECRET_ENV_MISSING/);
    await writeFile(envPath, "SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=x\n", {
      mode: 0o600
    });
    await assert.rejects(loadProfileEnv(profile), /exact local target contract/);
    await writeFile(envPath, "SUPABASE_URL=http://127.0.0.1:55321\nSUPABASE_ANON_KEY=x\n");
    await chmod(envPath, 0o600);
    assert.equal((await loadProfileEnv(profile)).SUPABASE_URL, "http://127.0.0.1:55321");
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("structured N9 status selects publishable key before legacy anon key", () => {
  const dummyAnon = "dummy-anon-value-for-n9-status-test";
  const dummyPublishable = "dummy-publishable-value-for-n9-status-test";
  const output = JSON.stringify({
    API_URL: "http://127.0.0.1:55321",
    ANON_KEY: dummyAnon,
    PUBLISHABLE_KEY: dummyPublishable,
    SERVICE_ROLE_KEY: "dummy-service-role-value-not-selected",
    DB_URL: "postgresql://local-value-not-selected"
  });
  const parsed = parseLocalStatusCredentials(output, n9);
  assert.equal(parsed.url === "http://127.0.0.1:55321", true);
  assert.equal(parsed.anonKey === dummyPublishable, true);

  let receivedArgs = null;
  const retrieved = retrieveLocalStatusCredentials(n9, (_profile, args) => {
    receivedArgs = args;
    return { status: 0, stdout: output, stderr: "" };
  });
  assert.deepEqual(receivedArgs, [
    "status",
    "-o",
    "json",
    "--network-id",
    n9.networkName
  ]);
  assert.equal(retrieved.anonKey === dummyPublishable, true);
  assert.deepEqual(
    profileSupabaseArgs(n9, receivedArgs),
    [
      "--workdir",
      n9.workdir,
      "status",
      "-o",
      "json",
      "--network-id",
      n9.networkName
    ]
  );
});

test("structured N9 status accepts publishable-only and legacy anon-only payloads", () => {
  const publishable = "dummy-publishable-only";
  const anon = "dummy-anon-only";
  assert.equal(
    parseLocalStatusCredentials(JSON.stringify({
      API_URL: "http://127.0.0.1:55321",
      PUBLISHABLE_KEY: publishable
    }), n9).anonKey,
    publishable
  );
  assert.equal(
    parseLocalStatusCredentials(JSON.stringify({
      API_URL: "http://127.0.0.1:55321",
      ANON_KEY: anon
    }), n9).anonKey,
    anon
  );
});

test("publishable client key remains compatible with the existing profile env contract", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-publishable-contract-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  const credentials = parseLocalStatusCredentials(JSON.stringify({
    API_URL: "http://127.0.0.1:55321",
    PUBLISHABLE_KEY: "dummy-publishable-profile-value"
  }), n9);
  try {
    assert.equal(await publishOrCorrelateProfileEnv(profile, credentials), "CREATED");
    assert.equal(await publishOrCorrelateProfileEnv(profile, credentials), "MATCH");
    const contents = await readFile(envPath, "utf8");
    assert.equal(contents.includes("SUPABASE_ANON_KEY=\"dummy-publishable-profile-value\""), true);
    assert.equal(contents.includes("PUBLISHABLE_KEY"), false);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("structured N9 status fails closed on malformed, remote, or incomplete output", () => {
  const valid = {
    API_URL: "http://127.0.0.1:55321",
    ANON_KEY: "dummy-anon-value-for-negative-status-test"
  };
  for (const output of [
    "not-json",
    JSON.stringify({ ...valid, API_URL: undefined }),
    JSON.stringify({ ...valid, ANON_KEY: undefined }),
    JSON.stringify({ ...valid, API_URL: "http://127.0.0.1:54321" }),
    JSON.stringify({ ...valid, API_URL: "https://remote.example.invalid" }),
    JSON.stringify({ ...valid, PROJECT_REF: "remote-project" }),
    JSON.stringify({
      API_URL: valid.API_URL,
      PUBLISHABLE_KEY: "",
      ANON_KEY: ""
    }),
    JSON.stringify({
      API_URL: valid.API_URL,
      PUBLISHABLE_KEY: 42,
      ANON_KEY: null
    }),
    JSON.stringify({
      API_URL: valid.API_URL,
      SERVICE_ROLE_KEY: "dummy-service-role-only"
    }),
    JSON.stringify({
      API_URL: valid.API_URL,
      SECRET_KEY: "dummy-secret-only"
    }),
    JSON.stringify({
      API_URL: valid.API_URL,
      DATABASE_URL: "postgresql://dummy-secret-only"
    })
  ]) {
    assert.throws(() => parseLocalStatusCredentials(output, n9), /invalid/);
  }
});

test("structured N9 status never exposes rejected key values", () => {
  const sentinel = "dummy-secret-sentinel-not-output";
  assert.throws(() => parseLocalStatusCredentials(JSON.stringify({
    API_URL: "https://remote.example.invalid",
    PUBLISHABLE_KEY: "",
    SECRET_KEY: sentinel,
    SERVICE_ROLE_KEY: sentinel,
    DATABASE_URL: sentinel
  }), n9), (error) => {
    assert.equal(error.message.includes(sentinel), false);
    return true;
  });
});

test("generated auth configuration selects the explicit auth mode", async () => {
  assert.equal(parseGeneratedAuthEnabled("[auth]\nenabled = false\n\n[api]\n"), false);
  assert.equal(parseGeneratedAuthEnabled("[auth]\nenabled = true\n"), true);
  assert.throws(() => parseGeneratedAuthEnabled("[api]\nenabled = true\n"), /auth configuration/);
  const configRoot = await mkdtemp("/private/tmp/n9-auth-config-test-");
  const configPath = path.join(configRoot, "supabase", "config.toml");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, "[auth]\nenabled = false\n");
  try {
    assert.equal(await readGeneratedAuthEnabled({ workdir: configRoot }), false);
  } finally {
    await rm(configRoot, { recursive: true });
  }
});

test("auth-disabled Data API validation uses only the exact N9 localhost target", async () => {
  const key = "dummy-auth-disabled-client-key";
  let observed = null;
  const result = await validateLocalDataApiCredential(n9, {
    url: "http://127.0.0.1:55321",
    anonKey: key
  }, async (url, options) => {
    observed = { url, options };
    return { status: 200, body: { cancel: async () => {} } };
  });
  assert.deepEqual(result, { state: "ACCEPTED" });
  assert.equal(observed.url, "http://127.0.0.1:55321/rest/v1/");
  assert.equal(observed.options.method, "GET");
  assert.equal(observed.options.headers.apikey, key);
  assert.equal(observed.options.headers.Authorization, `Bearer ${key}`);
  assert.equal(observed.options.redirect, "error");
  assert.equal(observed.url.includes("supabase.co"), false);
  await assert.rejects(validateLocalDataApiCredential(n9, {
    url: "https://ehmivhmsnhcrynvuahaq.supabase.co",
    anonKey: key
  }, async () => {
    throw new Error("must not request remote target");
  }));
});

test("auth-disabled Data API validation rejects redirects", async () => {
  await assert.rejects(
    validateLocalDataApiCredential(n9, {
      url: "http://127.0.0.1:55321",
      anonKey: "dummy-auth-disabled-client-key"
    }, async () => ({ status: 302, body: null })),
    (error) => error.kind === "REJECTED"
  );
});

test("auth-disabled runtime health requires owned resources and Data API acceptance", async () => {
  const result = await validateAuthDisabledLocalRuntimeHealth(n9, {
    url: "http://127.0.0.1:55321",
    anonKey: "dummy-auth-disabled-health-key"
  }, {
    preflight: async () => ({ state: PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING }),
    validateDataApi: async () => ({ state: "ACCEPTED" })
  });
  assert.equal(result.state, PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING);
});

test("auth-disabled Data API validation classifies rejection and connection failure without secrets", async () => {
  const key = "dummy-auth-disabled-failure-key";
  await assert.rejects(validateLocalDataApiCredential(n9, {
    url: "http://127.0.0.1:55321",
    anonKey: key
  }, async () => ({ status: 401, body: null })), (error) => {
    assert.equal(error.kind, "REJECTED");
    assert.equal(error.message.includes(key), false);
    return true;
  });
  await assert.rejects(validateLocalDataApiCredential(n9, {
    url: "http://127.0.0.1:55321",
    anonKey: key
  }, async () => {
    throw new Error(`raw connection ${key}`);
  }), (error) => {
    assert.equal(error.kind, "CONNECTION_FAILED");
    assert.equal(error.message.includes(key), false);
    return true;
  });
});

test("N9 env publication is mode-0600, exact-two-key, and no-replace", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-publication-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  const credentials = {
    url: "http://127.0.0.1:55321",
    anonKey: "dummy-anon-value-for-publication-test"
  };
  try {
    assert.equal(await publishOrCorrelateProfileEnv(profile, credentials), "CREATED");
    assert.equal((await stat(envPath)).mode & 0o777, 0o600);
    assert.deepEqual(Object.keys(await loadProfileEnv(profile)).sort(), [
      "SUPABASE_ANON_KEY",
      "SUPABASE_URL"
    ]);
    const original = await readFile(envPath, "utf8");
    assert.equal(original.endsWith("\n"), true);
    assert.equal(await publishOrCorrelateProfileEnv(profile, credentials), "MATCH");
    assert.equal(await readFile(envPath, "utf8") === original, true);
    assert.equal(await publishOrCorrelateProfileEnv(profile, {
      ...credentials,
      anonKey: "dummy-different-anon-value"
    }), "MISMATCH");
    assert.equal(await readFile(envPath, "utf8") === original, true);
    assert.deepEqual((await readdir(temporary)).sort(), [path.basename(envPath)]);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 env publication rejects symlinks and non-0600 files", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-safety-test-");
  const target = path.join(temporary, "target");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  const credentials = {
    url: "http://127.0.0.1:55321",
    anonKey: "dummy-anon-value-for-safety-test"
  };
  try {
    await writeFile(target, "preserved\n", { mode: 0o600 });
    await symlink(target, envPath);
    await assert.rejects(
      publishOrCorrelateProfileEnv(profile, credentials),
      /publication or correlation failed/
    );
    await unlink(envPath);
    await writeFile(
      envPath,
      `SUPABASE_URL=${credentials.url}\nSUPABASE_ANON_KEY=dummy\n`,
      { mode: 0o644 }
    );
    await assert.rejects(
      publishOrCorrelateProfileEnv(profile, credentials),
      /publication or correlation failed/
    );
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 env validation rejects path replacement after no-follow open", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-race-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const movedPath = path.join(temporary, "opened-env");
  const replacementPath = path.join(temporary, "replacement-env");
  const profile = { ...n9, envPath };
  try {
    await writeFile(
      envPath,
      "SUPABASE_URL=http://127.0.0.1:55321\nSUPABASE_ANON_KEY=dummy-original\n",
      { mode: 0o600 }
    );
    await writeFile(
      replacementPath,
      "SUPABASE_URL=http://127.0.0.1:55321\nSUPABASE_ANON_KEY=dummy-replacement\n",
      { mode: 0o600 }
    );
    await assert.rejects(loadProfileEnv(profile, {
      afterOpenForTest: async () => {
        await rename(envPath, movedPath);
        await symlink(replacementPath, envPath);
      }
    }), /changed during validation/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("concurrent N9 env publication never replaces the winning file", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-concurrent-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  const first = {
    url: "http://127.0.0.1:55321",
    anonKey: "dummy-first-concurrent-anon"
  };
  const second = {
    url: first.url,
    anonKey: "dummy-second-concurrent-anon"
  };
  try {
    const results = await Promise.all([
      publishOrCorrelateProfileEnv(profile, first),
      publishOrCorrelateProfileEnv(profile, second)
    ]);
    assert.equal(results.filter((result) => result === "CREATED").length, 1);
    assert.equal(results.filter((result) => result === "MISMATCH").length, 1);
    assert.equal((await stat(envPath)).mode & 0o777, 0o600);
    assert.deepEqual((await readdir(temporary)).sort(), [path.basename(envPath)]);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 env publication removes its temporary file after internal link failure", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-link-failure-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  try {
    await assert.rejects(publishOrCorrelateProfileEnv(profile, {
      url: "http://127.0.0.1:55321",
      anonKey: "dummy-link-failure-anon"
    }, {
      publishLink: async () => {
        const error = new Error("simulated local link failure");
        error.code = "EIO";
        throw error;
      }
    }), /simulated local link failure/);
    assert.deepEqual(await readdir(temporary), []);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("pre-publication failure preserves an unremovable temporary env as outcome-unknown", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-prepublish-unlink-failure-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  const events = [];
  const dependencies = mockStartDependencies(events);
  dependencies.publishEnv = (selected, observed) =>
    publishOrCorrelateProfileEnv(selected, observed, {
      publishLink: async () => {
        const error = new Error("raw pre-publication link failure");
        error.code = "EIO";
        throw error;
      },
      removeTemporary: async () => {
        throw new Error("raw pre-publication unlink failure");
      }
    });
  try {
    const error = await captureStartFailure(profile, dependencies);
    assertFailureClassifications(error, [
      "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
      "TEMP_PROFILE_ENV_PRESERVED",
      "RETRY_0"
    ]);
    assert.equal(error.attempt.envState, "ABSENT");
    assert.equal(error.attempt.temporaryEnv, "PRESERVED_UNREMOVED");
    assert.equal(error.attempt.primaryFailure, "ENV_PUBLICATION_STOP");
    assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
    assert.equal(error.message.includes("raw pre-publication link failure"), false);
    assert.equal(error.message.includes("raw pre-publication unlink failure"), false);
    await assert.rejects(stat(envPath), { code: "ENOENT" });
    assert.equal((await readdir(temporary)).length, 1);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 env publication preserves and identifies a linked env after validation failure", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-linked-validation-failure-test-");
  const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
  const profile = { ...n9, envPath };
  try {
    let failure = null;
    try {
      await publishOrCorrelateProfileEnv(profile, {
        url: "http://127.0.0.1:55321",
        anonKey: "dummy-linked-validation-failure-anon"
      }, {
        correlate: async () => {
          throw new Error("raw post-publication validation detail");
        }
      });
    } catch (error) {
      failure = error;
    }
    assert.equal(failure.envState, "CREATED");
    assert.equal(failure.message.includes("raw post-publication validation detail"), false);
    assert.equal((await stat(envPath)).mode & 0o777, 0o600);
    assert.deepEqual((await readdir(temporary)).sort(), [path.basename(envPath)]);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

for (const branch of ["CREATED", "CONCURRENT_EEXIST"]) {
  test(`${branch} env disposition survives temporary unlink failure`, async () => {
    const temporary = await mkdtemp("/private/tmp/n9-profile-temp-unlink-failure-test-");
    const envPath = path.join(temporary, ".env.supabase.n9-stage1.local");
    const profile = { ...n9, envPath };
    const credentials = {
      url: "http://127.0.0.1:55321",
      anonKey: "dummy-temp-unlink-failure-anon"
    };
    const events = [];
    const dependencies = mockStartDependencies(events);
    dependencies.publishEnv = (selected, observed) =>
      publishOrCorrelateProfileEnv(selected, observed, {
        publishLink: branch === "CREATED"
          ? undefined
          : async (_temporaryPath, finalPath) => {
              await writeFile(
                finalPath,
                `SUPABASE_URL=${credentials.url}\nSUPABASE_ANON_KEY=${credentials.anonKey}\n`,
                { mode: 0o600 }
              );
              const error = new Error("simulated concurrent winner");
              error.code = "EEXIST";
              throw error;
            },
        removeTemporary: async () => {
          throw new Error("raw temporary unlink failure");
        }
      });
    dependencies.retrieveCredentials = () => ({ ...credentials });
    try {
      const error = await captureStartFailure(profile, dependencies);
      assertFailureClassifications(error, [
        "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
        "PROFILE_ENV_PRESERVED",
        "TEMP_PROFILE_ENV_PRESERVED",
        "RETRY_0"
      ]);
      assert.equal(
        error.attempt.envState,
        branch === "CREATED" ? "CREATED" : "PRESERVED_UNCORRELATED"
      );
      assert.equal(error.attempt.primaryFailure, "ENV_PUBLICATION_STOP");
      assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
      assert.equal(error.attempt.temporaryEnv, "PRESERVED_UNREMOVED");
      assert.equal(error.message.includes("raw temporary unlink failure"), false);
      assert.equal((await stat(envPath)).mode & 0o777, 0o600);
      assert.equal((await readdir(temporary)).length, 2);
    } finally {
      await rm(temporary, { recursive: true });
    }
  });
}

test("final N9 health validation rechecks ownership and credential continuity", async () => {
  const expected = {
    url: "http://127.0.0.1:55321",
    anonKey: "dummy-health-anon"
  };
  const ready = await validateProfileHealth(n9, expected, {
    preflight: async () => ({ state: PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING }),
    retrieveCredentials: async () => ({ ...expected })
  });
  assert.equal(ready.state, PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING);
  await assert.rejects(validateProfileHealth(n9, expected, {
    preflight: async () => ({ state: PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING }),
    retrieveCredentials: async () => ({
      ...expected,
      anonKey: "dummy-health-mismatch"
    })
  }), /health correlation failed/);
});

function mockStartDependencies(events, {
  retrieveError = null,
  publishError = null,
  publishErrorState = null,
  entryEnv = "ABSENT",
  publishState = "CREATED",
  authEnabled = true,
  authEnv = {
    SUPABASE_URL: "http://127.0.0.1:55321",
    SUPABASE_ANON_KEY: "dummy-start-flow-anon"
  },
  dataApiError = null
} = {}) {
  let preflightCount = 0;
  return {
    assertIgnored: () => events.push("ignored"),
    materialize: async () => events.push("materialized"),
    validateWorkdir: async () => events.push("workdir-valid"),
    readAuthEnabled: async () => {
      events.push("auth-read");
      return authEnabled;
    },
    preflight: async () => {
      preflightCount += 1;
      events.push(`preflight-${preflightCount}`);
      return {
        state: preflightCount === 1
          ? PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT
          : PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
      };
    },
    snapshot: () => {
      events.push("snapshot");
      return { containerIds: [], volumeNames: [], networkExisted: false };
    },
    inspectEnv: async () => {
      events.push("env-inspected");
      return entryEnv;
    },
    inspectEnvIdentity: async () => {
      events.push("env-identity-inspected");
      return { dev: 1, ino: 1 };
    },
    ensureNetwork: () => events.push("network"),
    createProxy: async () => {
      events.push("proxy");
      return {
        dockerHost: "unix:///private/tmp/dummy-n9-proxy.sock",
        close: async () => events.push("proxy-closed")
      };
    },
    startCli: async () => events.push("started"),
    retrieveCredentials: () => {
      events.push("credentials-retrieved");
      if (retrieveError) throw retrieveError;
      return {
        url: "http://127.0.0.1:55321",
        anonKey: "dummy-start-flow-anon"
      };
    },
    validateDataApi: async () => {
      events.push("data-api-validated");
      if (dataApiError) throw dataApiError;
      return { state: "ACCEPTED" };
    },
    publishEnv: async () => {
      events.push("env-published");
      if (publishError) {
        if (publishErrorState !== null) {
          publishError.envState = publishErrorState;
        }
        throw publishError;
      }
      return publishState;
    },
    validateEnv: async () => {
      events.push("env-validated");
      return authEnv;
    },
    validateHealth: async () => {
      events.push("health-validated");
      return { state: PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING };
    },
    cleanup: async () => events.push("attempt-cleanup"),
    write: () => events.push("safe-output")
  };
}

test("first N9 start provisions env only after exact stack ownership", async () => {
  const events = [];
  const result = await startStack(n9, mockStartDependencies(events));
  assert.equal(events.indexOf("started") < events.indexOf("credentials-retrieved"), true);
  assert.equal(events.indexOf("preflight-2") < events.indexOf("credentials-retrieved"), true);
  assert.equal(events.indexOf("credentials-retrieved") < events.indexOf("env-published"), true);
  assert.equal(events.indexOf("env-published") < events.indexOf("env-validated"), true);
  assert.equal(events.indexOf("env-validated") < events.indexOf("health-validated"), true);
  assert.equal(events.includes("attempt-cleanup"), false);
  assert.deepEqual(result.terminalClassifications, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATED_AND_HEALTHY"
  ]);
  assert.equal(result.startCount, 1);
  assert.equal(result.retryCount, 0);
});

test("auth-disabled start uses the existing N9 env and skips CLI status credentials", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, {
    authEnabled: false,
    entryEnv: "PRESERVED_UNCORRELATED"
  });
  dependencies.retrieveCredentials = () => {
    throw new Error("CLI status must not be called when auth is disabled");
  };
  dependencies.validateDataApi = async (_profile, credentials) => {
    events.push(`data-api-key-${credentials.anonKey}`);
    return { state: "ACCEPTED" };
  };
  const result = await startStack(n9, dependencies);
  assert.equal(result.authMode, "DISABLED");
  assert.equal(result.credentials, "ENV_PREVALIDATED");
  assert.equal(result.dataApi, "VALIDATED");
  assert.equal(result.envState, "MATCH");
  assert.equal(events.includes("credentials-retrieved"), false);
  assert.equal(events.includes("env-published"), false);
  assert.equal(events.includes("data-api-key-dummy-start-flow-anon"), true);
  assert.deepEqual(result.terminalClassifications, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATED_AND_HEALTHY"
  ]);
});

test("auth-disabled start revalidates env identity after Data API health", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, {
    authEnabled: false,
    entryEnv: "PRESERVED_UNCORRELATED"
  });
  let validationCount = 0;
  let observedIdentity = null;
  dependencies.validateEnv = async (_profile, options) => {
    validationCount += 1;
    if (validationCount === 1) return {
      SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_ANON_KEY: "dummy-start-flow-anon"
    };
    observedIdentity = options?.expectedIdentity ?? null;
    throw new Error("profile env was replaced during runtime");
  };
  const error = await captureStartFailure(n9, dependencies);
  assert.equal(validationCount, 2);
  assert.deepEqual(observedIdentity, { dev: 1, ino: 1 });
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.primaryFailure, "ENV_VALIDATION_STOP");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
  assert.equal(error.attempt.terminalClassifications.includes("N9_STAGE_1_LOCAL_RUNTIME_CREATED_AND_HEALTHY"), false);
});

test("auth-disabled start stops on post-health credential drift", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, {
    authEnabled: false,
    entryEnv: "PRESERVED_UNCORRELATED"
  });
  let validationCount = 0;
  dependencies.validateEnv = async () => {
    validationCount += 1;
    return {
      SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_ANON_KEY: validationCount === 1
        ? "dummy-start-flow-anon"
        : "dummy-drifted-client-key"
    };
  };
  const error = await captureStartFailure(n9, dependencies);
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "CREDENTIAL_MISMATCH",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.primaryFailure, "CREDENTIAL_MISMATCH");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
  assert.equal(error.message.includes("dummy-drifted-client-key"), false);
});

for (const failure of ["missing", "malformed"]) {
  test(`auth-disabled ${failure} env stops before runtime mutation`, async () => {
    const events = [];
    const dependencies = mockStartDependencies(events, {
      authEnabled: false,
      entryEnv: failure === "missing" ? "ABSENT" : "PRESERVED_UNCORRELATED"
    });
    dependencies.validateEnv = async () => {
      throw new Error(`raw ${failure} env credential`);
    };
    const error = await captureStartFailure(n9, dependencies);
    assertFailureClassifications(error, [
      "N9_STAGE_1_LOCAL_RUNTIME_CREATION_STOP",
      ...(failure === "malformed" ? ["PROFILE_ENV_PRESERVED"] : []),
      "RETRY_0"
    ]);
    assert.equal(error.attempt.authMode, "DISABLED");
    assert.equal(error.attempt.runtimeMutation, "NOT_STARTED");
    assert.equal(events.includes("network"), false);
    assert.equal(error.message.includes("raw"), false);
  });
}

for (const failure of ["REJECTED", "CONNECTION_FAILED"]) {
  test(`auth-disabled Data API ${failure.toLowerCase()} preserves env and cleans runtime`, async () => {
    const events = [];
    const error = await captureStartFailure(n9, mockStartDependencies(events, {
      authEnabled: false,
      entryEnv: "PRESERVED_UNCORRELATED",
      dataApiError: Object.assign(new Error(`raw ${failure} client key`), { kind: failure })
    }));
    assertFailureClassifications(error, [
      "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
      "PROFILE_ENV_PRESERVED",
      "RETRY_0"
    ]);
    assert.equal(error.attempt.authMode, "DISABLED");
    assert.equal(error.attempt.dataApi, failure);
    assert.equal(error.attempt.primaryFailure, "DATA_API_STOP");
    assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
    assert.equal(events.includes("credentials-retrieved"), false);
    assert.equal(error.message.includes(`raw ${failure}`), false);
  });
}

async function captureStartFailure(profile, dependencies) {
  try {
    await startStack(profile, dependencies);
    assert.fail("expected startStack to fail");
  } catch (error) {
    assert.equal(error.name, "N9RuntimeStartError");
    return error;
  }
}

function assertFailureClassifications(error, expected) {
  assert.deepEqual(error.attempt.terminalClassifications, expected);
  assert.equal(error.attempt.retryCount, 0);
}

test("pre-mutation failure stops without runtime cleanup", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events);
  dependencies.materialize = async () => {
    throw new Error("raw pre-mutation detail");
  };
  const error = await captureStartFailure(n9, dependencies);
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_STOP",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.startCount, 0);
  assert.equal(error.attempt.runtimeCleanup, "NOT_REQUIRED");
  assert.equal(error.attempt.proxyClose, "NOT_REQUIRED");
  assert.equal(events.includes("network"), false);
  assert.equal(error.message.includes("raw pre-mutation detail"), false);
});

test("post-mutation pre-publication failure is failed-cleaned when env is absent", async () => {
  const events = [];
  const error = await captureStartFailure(n9, mockStartDependencies(events, {
    retrieveError: new Error("raw credential status detail")
  }));
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_FAILED_CLEANED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.startCount, 1);
  assert.equal(error.attempt.envState, "ABSENT");
  assert.equal(error.attempt.primaryFailure, "CREDENTIAL_STATUS_STOP");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
  assert.equal(error.attempt.proxyClose, "ATTEMPTED_COMPLETE");
  assert.equal(events.filter((event) => event === "attempt-cleanup").length, 1);
  assert.equal(events.filter((event) => event === "proxy-closed").length, 1);
  assert.equal(error.message.includes("raw credential status detail"), false);
});

test("pre-publication failure preserves an uncorrelated existing env", async () => {
  const events = [];
  const error = await captureStartFailure(n9, mockStartDependencies(events, {
    entryEnv: "PRESERVED_UNCORRELATED",
    retrieveError: new Error("raw status detail")
  }));
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.envState, "PRESERVED_UNCORRELATED");
  assert.equal(error.message.includes("raw status detail"), false);
});

test("post-publication validation failure is classified as created env preserved", async () => {
  const events = [];
  const error = await captureStartFailure(n9, mockStartDependencies(events, {
    publishError: new Error("raw linked validation detail"),
    publishErrorState: "CREATED"
  }));
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.envState, "CREATED");
  assert.equal(error.attempt.primaryFailure, "ENV_PUBLICATION_STOP");
  assert.equal(error.message.includes("raw linked validation detail"), false);
});

for (const envState of ["CREATED", "MATCH"]) {
  test(`${envState} env is preserved after health failure`, async () => {
    const events = [];
    const dependencies = mockStartDependencies(events, {
      entryEnv: envState === "MATCH" ? "PRESERVED_UNCORRELATED" : "ABSENT",
      publishState: envState
    });
    dependencies.validateHealth = async () => {
      events.push("health-failed");
      throw new Error("raw health credential detail");
    };
    const error = await captureStartFailure(n9, dependencies);
    assertFailureClassifications(error, [
      "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
      "PROFILE_ENV_PRESERVED",
      "RETRY_0"
    ]);
    assert.equal(error.attempt.envState, envState);
    assert.equal(error.attempt.primaryFailure, "HEALTH_STOP");
    assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
    assert.equal(error.message.includes("raw health credential detail"), false);
  });
}

test("credential mismatch preserves env and produces the exact mismatch classification", async () => {
  const events = [];
  const error = await captureStartFailure(n9, mockStartDependencies(events, {
    entryEnv: "PRESERVED_UNCORRELATED",
    publishState: "MISMATCH"
  }));
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "CREDENTIAL_MISMATCH",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.primaryFailure, "CREDENTIAL_MISMATCH");
  assert.equal(events.includes("env-validated"), false);
  assert.equal(events.filter((event) => event === "attempt-cleanup").length, 1);
});

test("runtime cleanup failure is bounded and preserves partial-state classification", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, { publishState: "CREATED" });
  dependencies.validateHealth = async () => {
    throw new Error("raw primary secret");
  };
  dependencies.cleanup = async () => {
    events.push("attempt-cleanup");
    throw new Error("raw cleanup secret");
  };
  const error = await captureStartFailure(n9, dependencies);
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "PARTIAL_N9_RESOURCE_PRESERVED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.primaryFailure, "HEALTH_STOP");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_INCOMPLETE");
  assert.equal(error.message.includes("raw primary secret"), false);
  assert.equal(error.message.includes("raw cleanup secret"), false);
});

test("proxy close failure after healthy validation becomes outcome-unknown", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, { publishState: "CREATED" });
  dependencies.createProxy = async () => ({
    dockerHost: "unix:///private/tmp/dummy-n9-proxy.sock",
    close: async () => {
      events.push("proxy-close-failed");
      throw new Error("raw proxy secret");
    }
  });
  const error = await captureStartFailure(n9, dependencies);
  assertFailureClassifications(error, [
    "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN",
    "PROFILE_ENV_PRESERVED",
    "RETRY_0"
  ]);
  assert.equal(error.attempt.primaryFailure, "PROXY_CLOSE_STOP");
  assert.equal(error.attempt.proxyClose, "ATTEMPTED_INCOMPLETE");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
  assert.equal(events.filter((event) => event === "proxy-close-failed").length, 1);
  assert.equal(events.filter((event) => event === "attempt-cleanup").length, 1);
  assert.equal(error.message.includes("raw proxy secret"), false);
});

test("primary failure survives simultaneous cleanup and proxy-close failures", async () => {
  const events = [];
  const dependencies = mockStartDependencies(events, { publishState: "CREATED" });
  dependencies.validateHealth = async () => {
    throw new Error("raw primary sentinel");
  };
  dependencies.createProxy = async () => ({
    dockerHost: "unix:///private/tmp/dummy-n9-proxy.sock",
    close: async () => {
      events.push("proxy-close-failed");
      throw new Error("raw proxy sentinel");
    }
  });
  dependencies.cleanup = async () => {
    events.push("attempt-cleanup");
    throw new Error("raw cleanup sentinel");
  };
  const error = await captureStartFailure(n9, dependencies);
  assert.equal(error.attempt.primaryFailure, "HEALTH_STOP");
  assert.equal(error.attempt.proxyClose, "ATTEMPTED_INCOMPLETE");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_INCOMPLETE");
  assert.equal(events.filter((event) => event === "proxy-close-failed").length, 1);
  assert.equal(events.filter((event) => event === "attempt-cleanup").length, 1);
  for (const sentinel of ["raw primary sentinel", "raw proxy sentinel", "raw cleanup sentinel"]) {
    assert.equal(error.message.includes(sentinel), false);
  }
});

test("post-health reporting failure preserves env and returns a bounded outcome", async () => {
  const events = [];
  let writeCount = 0;
  const dependencies = mockStartDependencies(events, { publishState: "CREATED" });
  dependencies.write = () => {
    writeCount += 1;
    if (writeCount > 1) {
      throw new Error("raw reporting sentinel");
    }
  };
  const error = await captureStartFailure(n9, dependencies);
  assert.equal(error.attempt.primaryFailure, "REPORTING_STOP");
  assert.equal(error.attempt.envState, "CREATED");
  assert.equal(error.attempt.runtimeCleanup, "ATTEMPTED_COMPLETE");
  assert.equal(error.message.includes("raw reporting sentinel"), false);
});

test("credential values remain absent from safe output and retrieval errors", async () => {
  const dummyAnon = "dummy-anon-that-must-never-be-output";
  const messages = [];
  const events = [];
  const dependencies = mockStartDependencies(events);
  dependencies.retrieveCredentials = () => ({
    url: "http://127.0.0.1:55321",
    anonKey: dummyAnon
  });
  dependencies.write = (message) => messages.push(message);
  await startStack(n9, dependencies);
  assert.equal(messages.join("").includes(dummyAnon), false);

  let failureMessage = "";
  try {
    retrieveLocalStatusCredentials(n9, () => ({
      status: 0,
      stdout: JSON.stringify({
        API_URL: "https://remote.example.invalid",
        ANON_KEY: dummyAnon
      }),
      stderr: dummyAnon
    }));
  } catch (error) {
    failureMessage = error.message;
  }
  assert.equal(failureMessage.includes(dummyAnon), false);
});

for (const [name, option, expectedAbsent] of [
  ["credential retrieval", { retrieveError: new Error("status unavailable") }, "env-published"],
  ["env publication", { publishError: new Error("publication unavailable") }, "env-validated"]
]) {
  test(`${name} failure applies only the injected N9 attempt cleanup`, async () => {
    const events = [];
    await assert.rejects(startStack(n9, mockStartDependencies(events, option)));
    assert.equal(events.includes("attempt-cleanup"), true);
    assert.equal(events.includes(expectedAbsent), false);
    assert.equal(events.includes("proxy-closed"), true);
  });
}

test("non-start commands keep the strict profile-env prerequisite", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-profile-nonstart-test-");
  const profile = {
    ...n9,
    envPath: path.join(temporary, ".env.supabase.n9-stage1.local")
  };
  try {
    await assert.rejects(statusStack(profile), /PROFILE_SECRET_ENV_MISSING/);
    await assert.rejects(stopStack(profile), /PROFILE_SECRET_ENV_MISSING/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N9 credential tooling contains no N6 profile-env copy path", async () => {
  const source = await readFile(
    path.join(repoRoot, "scripts", "supabase-local-n9-stage1.mjs"),
    "utf8"
  );
  assert.equal(source.includes(".env.supabase.local"), false);
});

test("generated N9 config changes only the exact profile identity and ports", async () => {
  const source = await readFile(path.join(repoRoot, "supabase", "config.toml"), "utf8");
  assert.match(source, /\[db\.pooler\]\nenabled = false\n(?:#[^\n]*\n)*port = 54329\n/);
  assert.equal(renderProfileConfig(source, n6), source);
  const rendered = renderProfileConfig(source, n9);
  for (const expected of [
    'project_id = "Where-to-Visit-N9-Stage1"',
    "port = 55321",
    "port = 55322",
    "shadow_port = 55320",
    "port = 55329",
    "port = 55323",
    "port = 55324",
    "port = 55327"
  ]) {
    assert.equal(rendered.includes(expected), true, expected);
  }
  assert.deepEqual(
    profileSupabaseArgs(n9, ["start"]),
    ["--workdir", n9.workdir, "start"]
  );
  assert.deepEqual(profileSupabaseArgs(n6, ["start"]), ["start"]);
});

test("generated workdir is no-replace, worktree-bound, and source-bound", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-local-profile-test-");
  try {
    await mkdir(path.join(temporary, "config"));
    await mkdir(path.join(temporary, "supabase"));
    await mkdir(path.join(temporary, "supabase", "migrations"));
    await writeFile(
      path.join(temporary, "config", "supabase-local-profiles.json"),
      await readFile(path.join(repoRoot, "config", "supabase-local-profiles.json"))
    );
    await writeFile(
      path.join(temporary, "supabase", "config.toml"),
      await readFile(path.join(repoRoot, "supabase", "config.toml"))
    );
    await writeFile(path.join(temporary, "supabase", "migrations", "one.sql"), "select 1;\n");
    const temporaryDescriptor = await loadLocalProfileDescriptor(temporary);
    const profile = temporaryDescriptor.profiles["n9-stage1"];
    const first = await materializeGeneratedWorkdir(temporary, profile);
    assert.equal(first.created, true);
    assert.equal((await validateGeneratedWorkdir(temporary, profile)).verdict, "PASS");
    const second = await materializeGeneratedWorkdir(temporary, profile);
    assert.equal(second.created, false);
    const generatedMigration = path.join(
      profile.workdir,
      "supabase",
      "migrations",
      "one.sql"
    );
    await writeFile(generatedMigration, "select 9;\n");
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /content drift/);
    await writeFile(generatedMigration, "select 1;\n");
    const extra = path.join(profile.workdir, "supabase", "migrations", "extra.sql");
    await writeFile(extra, "select 1;\n");
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /content drift/);
    await unlink(extra);
    await unlink(generatedMigration);
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /content drift/);
    await writeFile(generatedMigration, "select 1;\n");
    const extraDirectory = path.join(profile.workdir, "supabase", "unexpected-empty");
    await mkdir(extraDirectory);
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /content drift/);
    await rm(extraDirectory, { recursive: true });
    await rm(path.join(profile.workdir, "supabase", "snippets"), { recursive: true });
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /content drift/);
    await mkdir(path.join(profile.workdir, "supabase", "snippets"));
    await writeFile(path.join(temporary, "supabase", "migrations", "one.sql"), "select 2;\n");
    await assert.rejects(materializeGeneratedWorkdir(temporary, profile), /source identity mismatch/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("generated workdir rejects a symlinked destination root", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-local-profile-root-link-test-");
  try {
    await mkdir(path.join(temporary, "config"));
    await mkdir(path.join(temporary, "supabase"));
    await writeFile(
      path.join(temporary, "config", "supabase-local-profiles.json"),
      await readFile(path.join(repoRoot, "config", "supabase-local-profiles.json"))
    );
    await writeFile(
      path.join(temporary, "supabase", "config.toml"),
      await readFile(path.join(repoRoot, "supabase", "config.toml"))
    );
    const profile = (await loadLocalProfileDescriptor(temporary)).profiles["n9-stage1"];
    await materializeGeneratedWorkdir(temporary, profile);
    const moved = `${profile.workdir}-owned`;
    await rename(profile.workdir, moved);
    await symlink(moved, profile.workdir);
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /real directory/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("generated workdir rejects a symlinked ownership marker", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-local-profile-marker-link-test-");
  try {
    await mkdir(path.join(temporary, "config"));
    await mkdir(path.join(temporary, "supabase"));
    await writeFile(
      path.join(temporary, "config", "supabase-local-profiles.json"),
      await readFile(path.join(repoRoot, "config", "supabase-local-profiles.json"))
    );
    await writeFile(
      path.join(temporary, "supabase", "config.toml"),
      await readFile(path.join(repoRoot, "supabase", "config.toml"))
    );
    const profile = (await loadLocalProfileDescriptor(temporary)).profiles["n9-stage1"];
    await materializeGeneratedWorkdir(temporary, profile);
    const marker = path.join(profile.workdir, ".wtv-local-profile.json");
    const moved = `${marker}-owned`;
    await rename(marker, moved);
    await symlink(moved, marker);
    await assert.rejects(validateGeneratedWorkdir(temporary, profile), /marker/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("generated workdir rejects a symlinked ancestor", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-local-profile-ancestor-link-test-");
  const redirected = await mkdtemp("/private/tmp/n9-local-profile-redirect-");
  try {
    await mkdir(path.join(temporary, "config"));
    await mkdir(path.join(temporary, "supabase"));
    await writeFile(
      path.join(temporary, "config", "supabase-local-profiles.json"),
      await readFile(path.join(repoRoot, "config", "supabase-local-profiles.json"))
    );
    await writeFile(
      path.join(temporary, "supabase", "config.toml"),
      await readFile(path.join(repoRoot, "supabase", "config.toml"))
    );
    await symlink(redirected, path.join(temporary, "supabase", ".branches"));
    const profile = (await loadLocalProfileDescriptor(temporary)).profiles["n9-stage1"];
    await assert.rejects(materializeGeneratedWorkdir(temporary, profile), /ancestor/);
  } finally {
    await rm(temporary, { recursive: true });
    await rm(redirected, { recursive: true });
  }
});

test("generated workdir rejects symlinked canonical input", async () => {
  const temporary = await mkdtemp("/private/tmp/n9-local-profile-link-test-");
  try {
    await mkdir(path.join(temporary, "config"));
    await mkdir(path.join(temporary, "supabase"));
    await writeFile(
      path.join(temporary, "config", "supabase-local-profiles.json"),
      await readFile(path.join(repoRoot, "config", "supabase-local-profiles.json"))
    );
    await writeFile(
      path.join(temporary, "supabase", "config.toml"),
      await readFile(path.join(repoRoot, "supabase", "config.toml"))
    );
    await symlink("config.toml", path.join(temporary, "supabase", "unsafe-link"));
    const profile = (await loadLocalProfileDescriptor(temporary)).profiles["n9-stage1"];
    await assert.rejects(materializeGeneratedWorkdir(temporary, profile), /Symlinks are forbidden/);
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("N6 resources do not collide with the exact N9 profile", () => {
  const n6Container = {
    id: "n6",
    name: "supabase_db_Where-to-Visit",
    projectId: n6.projectId,
    service: "db",
    networks: [n6.networkName],
    mounts: [],
    published: [{ hostIp: "127.0.0.1", hostPort: n6.ports.db }]
  };
  assert.deepEqual(selectProfileContainers([n6Container], n9), []);
  assert.equal(classifyProfileResources({
    profile: n9,
    containers: [n6Container],
    network: null,
    volumes: [],
    conflictingPorts: []
  }).state, PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT);
});

test("N6 default running-resource validation remains unchanged", () => {
  assert.equal(
    classifyProfileResources({ profile: n6, ...validN6Resources() }).state,
    PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
  );
});

test("ownership gate accepts exact N9 resources and rejects every unsafe class", () => {
  assert.equal(
    classifyProfileResources({ profile: n9, ...validN9Resources() }).state,
    PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
  );
  assert.equal(classifyProfileResources({
    profile: n9,
    containers: [],
    network: null,
    volumes: [],
    conflictingPorts: [{ hostIp: "127.0.0.1", hostPort: n9.ports.api }]
  }).state, PROFILE_RESOURCE_STATES.FOREIGN_OWNED);
  assert.equal(classifyProfileResources({
    profile: n9,
    containers: [],
    network: validN9Resources().network,
    volumes: [],
    conflictingPorts: []
  }).state, PROFILE_RESOURCE_STATES.UNKNOWN_OWNER);
  const foreign = validN9Resources();
  foreign.containers[0].projectId = n6.projectId;
  assert.equal(
    classifyProfileResources({ profile: n9, ...foreign }).state,
    PROFILE_RESOURCE_STATES.FOREIGN_OWNED
  );
  const unsafe = validN9Resources();
  unsafe.containers[0].published[0].hostIp = "0.0.0.0";
  assert.equal(
    classifyProfileResources({ profile: n9, ...unsafe }).state,
    PROFILE_RESOURCE_STATES.FOREIGN_OWNED
  );
  for (const labels of [{}, { "com.supabase.cli.project": n6.projectId }]) {
    assert.equal(classifyProfileResources({
      profile: n9,
      containers: [],
      network: null,
      volumes: [{ Name: `supabase_db_${n9.containerSuffix}`, Labels: labels }],
      conflictingPorts: []
    }).state, PROFILE_RESOURCE_STATES.UNKNOWN_OWNER);
  }
  assert.equal(selectProfileVolumes([
    { Name: `supabase_db_${n9.containerSuffix}`, Labels: {} },
    { Name: `supabase_db_${n6.containerSuffix}`, Labels: {} }
  ], n9).length, 1);
});

test("absent-target preflight probes all reserved ports and fails closed", async () => {
  const absent = () => ({ containers: [], network: null, volumes: [], conflictingPorts: [] });
  const probed = [];
  assert.equal((await preflightProfileResources(n9, {
    inspect: absent,
    probe: async (port) => { probed.push(port); }
  })).state, PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT);
  assert.deepEqual(probed, n9.allReservedPorts);

  for (const port of [n9.ports.api, n9.ports.shadow, n9.ports.pooler]) {
    const result = await preflightProfileResources(n9, {
      inspect: absent,
      probe: async (candidate) => {
        if (candidate === port) throw new Error("occupied");
      }
    });
    assert.deepEqual(result, {
      state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED,
      reason: `HOST_PORT_${port}_OCCUPIED`
    });
  }
});

test("existing-target preflight probes reserved-only ports and fails closed", async () => {
  const existing = () => validN9Resources();
  const probed = [];
  assert.equal((await preflightProfileResources(n9, {
    inspect: existing,
    probe: async (port) => { probed.push(port); }
  })).state, PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING);
  assert.deepEqual(probed, [n9.ports.shadow, n9.ports.pooler]);

  for (const port of [n9.ports.shadow, n9.ports.pooler]) {
    const result = await preflightProfileResources(n9, {
      inspect: existing,
      probe: async (candidate) => {
        if (candidate === port) throw new Error("occupied");
      }
    });
    assert.deepEqual(result, {
      state: PROFILE_RESOURCE_STATES.FOREIGN_OWNED,
      reason: `HOST_PORT_${port}_OCCUPIED`
    });
  }
});

test("running-state validation distinguishes reserved from expected published ports", () => {
  const missingExpected = validN9Resources();
  missingExpected.containers.find((container) => container.id === "analytics").published = [];
  assert.equal(
    classifyProfileResources({ profile: n9, ...missingExpected }).state,
    PROFILE_RESOURCE_STATES.UNKNOWN_OWNER
  );

  for (const unexpectedPort of [n9.ports.shadow, n9.ports.pooler, 55999]) {
    const unexpected = validN9Resources();
    unexpected.containers[0].published.push({
      hostIp: "127.0.0.1",
      hostPort: unexpectedPort
    });
    assert.equal(
      classifyProfileResources({ profile: n9, ...unexpected }).state,
      PROFILE_RESOURCE_STATES.FOREIGN_OWNED
    );
  }
  assert.equal(
    classifyProfileResources({ profile: n9, ...validN9Resources() }).state,
    PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING
  );
});

test("safe summary distinguishes reserved and expected published ports", () => {
  const summary = safeProfileSummary(n9, {
    state: PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT
  });
  assert.match(summary, /Reserved ports: 55320,55321,55322,55323,55324,55327,55329/);
  assert.match(summary, /Expected published ports: 55321,55322,55323,55324,55327/);
  assert.equal(summary.includes("Ports:"), false);
});

test("attempt cleanup plan selects only resources created for N9", () => {
  const n6Container = {
    id: "n6",
    name: "supabase_db_Where-to-Visit",
    projectId: n6.projectId,
    service: "db",
    networks: [n6.networkName],
    mounts: [],
    published: [{ hostIp: "127.0.0.1", hostPort: n6.ports.db }]
  };
  const after = validN9Resources();
  after.containers.push(n6Container);
  const plan = planAttemptCleanup(n9, {
    containerIds: [],
    volumeNames: [],
    networkExisted: false
  }, after);
  assert.equal(plan.containerIds.includes("n6"), false);
  assert.deepEqual(plan.containerIds.sort(), ["analytics", "db", "inbucket", "kong", "studio"]);
  assert.deepEqual(plan.volumeNames, ["supabase_db_Where-to-Visit-N9-Stage1"]);
  assert.equal(plan.removeNetwork, true);
  const attached = validN9Resources();
  attached.network.Containers = Object.fromEntries(
    attached.containers.map((container) => [container.id, {}])
  );
  assert.equal(planAttemptCleanup(n9, {
    containerIds: [],
    volumeNames: [],
    networkExisted: false
  }, attached).removeNetwork, true);
  attached.network.Containers.foreign = {};
  assert.throws(() => planAttemptCleanup(n9, {
    containerIds: [],
    volumeNames: [],
    networkExisted: false
  }, attached));
  const foreign = validN9Resources();
  foreign.volumes[0].Labels["com.supabase.cli.project"] = n6.projectId;
  assert.throws(() => planAttemptCleanup(n9, {
    containerIds: [],
    volumeNames: [],
    networkExisted: false
  }, foreign));
});

test("Docker DB-create observation binds to the selected exact project", () => {
  assert.equal(isExpectedDatabaseCreate(
    "/containers/create?name=supabase_db_Where-to-Visit-N9-Stage1",
    { Labels: {} },
    n9.projectId
  ), true);
  assert.equal(isExpectedDatabaseCreate(
    "/containers/create?name=supabase_db_Where-to-Visit",
    { Labels: { "com.supabase.cli.project": n6.projectId } },
    n9.projectId
  ), false);
  assert.equal(isExpectedDatabaseCreate(
    "/containers/create?name=supabase_db_Where-to-Visit-N9-Stage1",
    { Labels: { "com.supabase.cli.project": n6.projectId } },
    n9.projectId
  ), false);
});
