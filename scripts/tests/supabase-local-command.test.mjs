import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";

import {
  assertLocalOnlyCommandForTest,
  assertN5CredentialDbContainer,
  captureDiagnosticFailure,
  executeN5RolePasswordMutation,
  extractPgTapFailureIdentity,
  inspectDiagnosticSecrets,
  loginPostcheckN5LocalCredential,
  n5CredentialPsqlArgs,
  parseWrapperArguments,
  provisionN5LocalCredential,
  rotateN5LocalCredential,
  routeLocalCommandFailure,
  runChildForFailureRouting
} from "../supabase-local-command.mjs";
import { createN5EventCreatorLocalProfile } from "../lib/n5-event-creator-local-profile.mjs";

const RESET_ARGS = ["db", "reset", "--local", "--no-seed"];
const PGTAP_FILES = [
  "supabase/tests/collaborative_response_row_model_test.sql",
  "supabase/tests/private_rls_helpers_test.sql",
  "supabase/tests/ownerless_final_state_test.sql"
];
const PGTAP_ARGS = ["test", "db", "--local", ...PGTAP_FILES];
const temporaryParents = new Set();

after(async () => {
  await Promise.all(
    [...temporaryParents].map((parent) =>
      rm(parent, { recursive: true, force: false })
    )
  );
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function temporaryEvidencePath(name = "evidence") {
  const parent = await mkdtemp("/private/tmp/n5-reset-diagnostic-test-");
  await chmod(parent, 0o700);
  temporaryParents.add(parent);
  return { parent, evidence: path.join(parent, name) };
}

function failure({ stdout = "", stderr = "", status = 7 } = {}) {
  return Object.assign(new Error("fake CLI failure"), {
    status,
    stdout,
    stderr
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const VALID_CREDENTIAL_CONTAINER = Object.freeze({
  id: "db-id",
  name: "supabase_db_Where-to-Visit",
  service: null,
  running: true,
  networks: ["where-to-visit-supabase-local"],
  published: [{ hostIp: "127.0.0.1", hostPort: 54322 }]
});

test("credential command accepts only the exact local wrapper arguments", () => {
  const args = ["credential", "provision", "--local"];
  assert.deepEqual(parseWrapperArguments(args), {
    cliArgs: args,
    command: "credential provision",
    diagnosticDirectory: null,
    diagnosticMode: null
  });
  assert.doesNotThrow(() => assertLocalOnlyCommandForTest(args));
  for (const invalid of [
    ["credential", "provision"],
    ["credential", "provision", "--linked"],
    ["credential", "provision", "--db-url", "remote"],
    ["credential", "provision", "--local", "other-role"],
    ["credential", "provision", "--local", "other-database"]
  ]) {
    assert.throws(() => assertLocalOnlyCommandForTest(invalid));
  }
});

test("credential rotation requires one exact local command and an explicit quarantine path", () => {
  const quarantine = "/private/tmp/human-selected/credential-quarantine";
  const args = [
    "credential",
    "rotate",
    "--local",
    "--wtv-credential-quarantine-dir",
    quarantine
  ];
  assert.deepEqual(parseWrapperArguments(args), {
    cliArgs: ["credential", "rotate", "--local"],
    command: "credential rotate",
    diagnosticDirectory: null,
    diagnosticMode: null,
    credentialQuarantineDirectory: quarantine
  });
  assert.doesNotThrow(() =>
    assertLocalOnlyCommandForTest(["credential", "rotate", "--local"])
  );
  for (const invalid of [
    ["credential", "rotate", "--local"],
    ["credential", "rotate", "--linked", "--wtv-credential-quarantine-dir", quarantine],
    ["db", "reset", "--local", "--no-seed", "--wtv-credential-quarantine-dir", quarantine],
    [
      ...args,
      "--wtv-credential-quarantine-dir",
      `${quarantine}-second`
    ]
  ]) {
    assert.throws(() => parseWrapperArguments(invalid));
  }
});

test("credential target requires the exact running localhost DB container", () => {
  assert.equal(
    assertN5CredentialDbContainer(VALID_CREDENTIAL_CONTAINER),
    VALID_CREDENTIAL_CONTAINER
  );
  assert.equal(
    assertN5CredentialDbContainer({
      ...VALID_CREDENTIAL_CONTAINER,
      service: "db"
    }).service,
    "db"
  );
  for (const invalid of [
    { ...VALID_CREDENTIAL_CONTAINER, running: false },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      networks: ["remote-network"]
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      service: "storage",
      name: "unexpected"
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      service: "storage"
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      name: "unexpected"
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      published: [{ hostIp: "0.0.0.0", hostPort: 54322 }]
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      published: [{ hostIp: "127.0.0.1", hostPort: 6543 }]
    },
    {
      ...VALID_CREDENTIAL_CONTAINER,
      published: [
        { hostIp: "127.0.0.1", hostPort: 54322 },
        { hostIp: "127.0.0.1", hostPort: 54329 }
      ]
    }
  ]) {
    assert.throws(
      () => assertN5CredentialDbContainer(invalid),
      /N5 local credential target verification failed\./
    );
  }
});

test("password-setting psql arguments contain no secret and fix the exact role", () => {
  const args = n5CredentialPsqlArgs("db-id");
  assert.equal(args.includes("db-id"), true);
  assert.equal(args.includes("--username=postgres"), true);
  assert.equal(args.includes("--dbname=postgres"), true);
  assert.equal(
    args.includes("--command=\\password kimenosuke_event_creator"),
    true
  );
  assert.equal(args.join("\n").includes("A".repeat(43)), false);
  assert.equal(
    args.filter((argument) => argument.includes("\\password")).length,
    1
  );
  assert.equal(
    args.some((argument) => /service_role|authenticated|anon/.test(argument)),
    false
  );
});

test("password-setting sends the generated value only to the psql password prompt", async () => {
  const generated = Buffer.alloc(32, 0x5a).toString("base64url");
  let calls = 0;
  await executeN5RolePasswordMutation(
    "db-id",
    generated,
    async (command, args, options) => {
      calls += 1;
      assert.equal(command, "docker");
      assert.equal(args.join("\n").includes(generated), false);
      assert.equal(options.env, undefined);
      assert.equal(options.input, `${generated}\n${generated}\n`);
      return { stdout: "ignored", stderr: "ignored", code: 0 };
    }
  );
  assert.equal(calls, 1);
});

test("non-TTY and confirmation mismatch stop before generation or mutation", async () => {
  for (const input of [{ isTTY: false }, { isTTY: true }]) {
    let generationCount = 0;
    let mutationCount = 0;
    let profileCount = 0;
    let loginCount = 0;
    const output = { isTTY: input.isTTY };
    await assert.rejects(
      provisionN5LocalCredential({
        input,
        output,
        confirm: async () => false,
        assertTarget: () => VALID_CREDENTIAL_CONTAINER,
        assertProfileAbsent: async () => {},
        random: () => {
          generationCount += 1;
          return "A".repeat(43);
        },
        setPassword: async () => {
          mutationCount += 1;
        },
        createProfile: async () => {
          profileCount += 1;
        },
        loginPostcheck: async () => {
          loginCount += 1;
        }
      }),
      input.isTTY
        ? /N5 local credential confirmation failed\./
        : /requires an interactive TTY/
    );
    assert.deepEqual(
      [generationCount, mutationCount, profileCount, loginCount],
      [0, 0, 0, 0]
    );
  }
});

test("successful credential provisioning generates once and exposes no secret", async () => {
  const generated = Buffer.alloc(32, 0x5a).toString("base64url");
  const observations = {
    generation: 0,
    password: 0,
    profile: 0,
    login: 0
  };
  const result = await provisionN5LocalCredential({
    input: { isTTY: true },
    output: { isTTY: true },
    confirm: async () => true,
    assertTarget: () => VALID_CREDENTIAL_CONTAINER,
    assertProfileAbsent: async () => {},
    random: (size) => {
      assert.equal(size, 32);
      observations.generation += 1;
      return Buffer.alloc(32, 0x5a);
    },
    setPassword: async (containerId, password) => {
      observations.password += 1;
      assert.equal(containerId, "db-id");
      assert.equal(password, generated);
    },
    createProfile: async (password) => {
      observations.profile += 1;
      assert.equal(password, generated);
      return {
        profilePath: "/redacted/profile",
        mode: 0o600,
        keyCount: 1,
        finalNewline: true
      };
    },
    loginPostcheck: async () => {
      observations.login += 1;
      return {
        connection: "PASS",
        currentUser: "kimenosuke_event_creator",
        database: "postgres",
        mutationCount: 0
      };
    }
  });
  assert.deepEqual(observations, {
    generation: 1,
    password: 1,
    profile: 1,
    login: 1
  });
  assert.equal(result.generation, "OS_CSPRNG_32_BYTES_BASE64URL");
  assert.equal(result.passwordSettingCount, 1);
  assert.equal(result.profileCreationCount, 1);
  assert.equal(result.loginPostcheckCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(JSON.stringify(result).includes(generated), false);
  assert.equal(JSON.stringify(result).includes("postgresql://"), false);
});

test("credential rotation changes the password once, quarantines first, and exposes no secret", async () => {
  const generated = Buffer.alloc(32, 0x5a).toString("base64url");
  const order = [];
  const result = await rotateN5LocalCredential({
    input: { isTTY: true },
    output: { isTTY: true },
    quarantineDirectory: "/private/tmp/human-selected/rotation-1",
    confirm: async () => true,
    assertTarget: () => VALID_CREDENTIAL_CONTAINER,
    inspectProfile: async () => {
      order.push("inspect");
    },
    random: () => Buffer.alloc(32, 0x5a),
    setPassword: async (containerId, password) => {
      order.push("password");
      assert.equal(containerId, "db-id");
      assert.equal(password, generated);
    },
    quarantineProfile: async () => {
      order.push("quarantine");
      return { mode: 0o600, profileMovedCount: 1 };
    },
    createProfile: async (password) => {
      order.push("create");
      assert.equal(password, generated);
      return { mode: 0o600, keyCount: 1 };
    },
    loginPostcheck: async () => {
      order.push("login");
      return { connection: "PASS" };
    }
  });
  assert.deepEqual(order, ["inspect", "password", "quarantine", "create", "login"]);
  assert.equal(result.passwordSettingCount, 1);
  assert.equal(result.profileQuarantineCount, 1);
  assert.equal(result.profileCreationCount, 1);
  assert.equal(result.loginPostcheckCount, 1);
  assert.equal(JSON.stringify(result).includes(generated), false);
  assert.equal(JSON.stringify(result).includes("postgresql://"), false);
});

test("password failure is generic and profile or login never starts", async () => {
  const generated = "A".repeat(43);
  let profileCount = 0;
  let loginCount = 0;
  await assert.rejects(
    provisionN5LocalCredential({
      input: { isTTY: true },
      output: { isTTY: true },
      confirm: async () => true,
      assertTarget: () => VALID_CREDENTIAL_CONTAINER,
      assertProfileAbsent: async () => {},
      random: () => Buffer.alloc(32, 0x41),
      setPassword: async () => {
        throw new Error(`child failed with ${generated}`);
      },
      createProfile: async () => {
        profileCount += 1;
      },
      loginPostcheck: async () => {
        loginCount += 1;
      }
    }),
    (error) => {
      assert.equal(error.message, "N5 local role password setting failed.");
      assert.equal(error.message.includes(generated), false);
      assert.equal(error.phase, "PASSWORD");
      return true;
    }
  );
  assert.equal(profileCount, 0);
  assert.equal(loginCount, 0);
});

test("profile and login failures preserve completed prior phases without retry", async () => {
  for (const failingPhase of ["profile", "login"]) {
    const counts = { password: 0, profile: 0, login: 0 };
    await assert.rejects(
      provisionN5LocalCredential({
        input: { isTTY: true },
        output: { isTTY: true },
        confirm: async () => true,
        assertTarget: () => VALID_CREDENTIAL_CONTAINER,
        assertProfileAbsent: async () => {},
        random: () => Buffer.alloc(32, 0x41),
        setPassword: async () => {
          counts.password += 1;
        },
        createProfile: async () => {
          counts.profile += 1;
          if (failingPhase === "profile") throw new Error("fake");
          return { mode: 0o600, keyCount: 1 };
        },
        loginPostcheck: async () => {
          counts.login += 1;
          if (failingPhase === "login") throw new Error("fake");
          return { connection: "PASS" };
        }
      }),
      failingPhase === "profile"
        ? /profile creation failed after password setting/
        : /login postcheck failed/
    );
    assert.deepEqual(
      counts,
      failingPhase === "profile"
        ? { password: 1, profile: 1, login: 0 }
        : { password: 1, profile: 1, login: 1 }
    );
  }
});

test("login postcheck issues one identity-only SELECT and closes the client", async () => {
  const root = await mkdtemp("/private/tmp/n5-login-postcheck-");
  temporaryParents.add(root);
  await createN5EventCreatorLocalProfile(root, "A".repeat(43));
  const observations = {
    connected: 0,
    query: null,
    ended: 0,
    config: null
  };
  const result = await loginPostcheckN5LocalCredential(root, (config) => {
    observations.config = config;
    return {
      async connect() {
        observations.connected += 1;
      },
      async query(query) {
        observations.query = query;
        return { rows: [{ user_ok: true, database_ok: true }] };
      },
      async end() {
        observations.ended += 1;
      }
    };
  });
  assert.equal(observations.connected, 1);
  assert.equal(observations.ended, 1);
  assert.match(observations.query.text, /^SELECT current_user = /);
  assert.equal(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i.test(
    observations.query.text
  ), false);
  assert.equal(observations.config.ssl, false);
  assert.equal(result.connection, "PASS");
  assert.equal(result.currentUser, "kimenosuke_event_creator");
  assert.equal(result.database, "postgres");
  assert.equal(result.mutationCount, 0);
  assert.equal(JSON.stringify(result).includes("postgresql://"), false);
});

test("diagnostic flag is reset-only, explicit, and removed from CLI args", () => {
  const evidence = "/private/tmp/human-selected/evidence";
  assert.deepEqual(
    parseWrapperArguments([
      ...RESET_ARGS,
      "--wtv-reset-diagnostic-dir",
      evidence
    ]),
    {
      cliArgs: RESET_ARGS,
      command: "db reset",
      diagnosticDirectory: evidence,
      diagnosticMode: "reset"
    }
  );
  assert.deepEqual(parseWrapperArguments(RESET_ARGS), {
    cliArgs: RESET_ARGS,
    command: "db reset",
    diagnosticDirectory: null,
    diagnosticMode: null
  });
  for (const args of [
    ["migration", "list", "--local", "--wtv-reset-diagnostic-dir", evidence],
    [...RESET_ARGS, "--debug", "--wtv-reset-diagnostic-dir", evidence],
    [...RESET_ARGS, "--wtv-reset-diagnostic-dir"],
    [
      ...RESET_ARGS,
      "--wtv-reset-diagnostic-dir",
      evidence,
      "--wtv-reset-diagnostic-dir",
      `${evidence}-2`
    ]
  ]) {
    assert.throws(() => parseWrapperArguments(args));
  }
});

test("complete stdout and stderr survive beyond twenty lines before cleanup", async () => {
  const { evidence } = await temporaryEvidencePath();
  const stdout = [
    "Applying migration supabase/migrations/20260730011534_ownerless_final_state.sql",
    "SQLSTATE: 42501",
    "line 209",
    "statement 17",
    "statement: alter role kimenosuke_event_creator",
    ...Array.from({ length: 30 }, (_, index) => `stdout-tail-${index}`)
  ].join("\n") + "\n";
  const stderr = [
    "FIRST STDERR CAUSE",
    ...Array.from({ length: 30 }, (_, index) => `stderr-tail-${index}`)
  ].join("\n") + "\n";
  const order = [];
  const result = await captureDiagnosticFailure({
    error: failure({ stdout, stderr }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {
      assert.equal(
        await readFile(path.join(evidence, "stdout.raw.log"), "utf8"),
        stdout
      );
      assert.equal(
        await readFile(path.join(evidence, "stderr.raw.log"), "utf8"),
        stderr
      );
      assert.equal(
        (
          await readJson(path.join(evidence, "pre-cleanup-record.json"))
        ).phase,
        "PRE_CLEANUP_CAPTURED"
      );
      order.push("cleanup");
    },
    snapshot: async (phase) => {
      order.push(phase);
      return { phase };
    }
  });

  assert.equal(
    await readFile(path.join(evidence, "stdout.raw.log"), "utf8"),
    stdout
  );
  assert.equal(
    await readFile(path.join(evidence, "stderr.raw.log"), "utf8"),
    stderr
  );
  assert.equal(
    (await readFile(path.join(evidence, "stdout.raw.log"), "utf8"))
      .startsWith("Applying migration"),
    true
  );
  assert.equal(
    (await readFile(path.join(evidence, "stderr.raw.log"), "utf8"))
      .startsWith("FIRST STDERR CAUSE"),
    true
  );
  assert.deepEqual(order, ["pre-cleanup", "cleanup", "post-cleanup"]);

  const manifest = await readJson(
    path.join(evidence, "diagnostic-manifest.json")
  );
  assert.equal(manifest.original_child_exit_code, 7);
  assert.equal(manifest.wrapper_public_exit_code, 1);
  assert.equal(manifest.failure_identity.sqlstate, "42501");
  assert.equal(
    manifest.failure_identity.migration,
    "supabase/migrations/20260730011534_ownerless_final_state.sql"
  );
  assert.equal(manifest.failure_identity.line, 209);
  assert.equal(manifest.failure_identity.statement_ordinal, 17);
  assert.equal(
    manifest.failure_identity.statement_identity.sha256,
    sha256("alter role kimenosuke_event_creator")
  );
  assert.equal(manifest.stdout.sha256, sha256(stdout));
  assert.equal(manifest.stderr.sha256, sha256(stderr));
  assert.equal(manifest.stdout.bytes, Buffer.byteLength(stdout));
  assert.equal(manifest.stderr.bytes, Buffer.byteLength(stderr));
  assert.equal(manifest.stdout.final_newline, true);
  assert.equal(manifest.stderr.final_newline, true);
  assert.equal(manifest.command.retry_count, 0);
  assert.deepEqual(manifest.command.arguments, [
    ...RESET_ARGS,
    "--network-id",
    "where-to-visit-supabase-local"
  ]);
  assert.equal(manifest.command.executable, "node_modules/.bin/supabase");
  assert.equal(
    manifest.command.arguments.some((argument) => /[|;]/.test(argument)),
    false
  );
  assert.equal(manifest.evidence.verdict, "COMPLETE");
  assert.equal(manifest.cleanup.verdict, "PASS");
  assert.match(result.summary, /Wrapper exit: 1/);
});

test("failure identity uses the last applied migration preceding ERROR", async () => {
  const { evidence } = await temporaryEvidencePath();
  const stderr = [
    "Applying migration 20260708000000_slice_1_events_participants.sql...",
    "Applying migration 20260730011534_ownerless_final_state.sql...",
    "ERROR: column reference creator_role.oid is ambiguous (SQLSTATE 42702)",
    "statement 33"
  ].join("\n") + "\n";
  const result = await captureDiagnosticFailure({
    error: failure({ stderr }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {},
    snapshot: async (phase) => ({ phase })
  });

  assert.equal(
    result.manifest.failure_identity.migration,
    "20260730011534_ownerless_final_state.sql"
  );
  assert.equal(result.manifest.failure_identity.sqlstate, "42702");
  assert.equal(result.manifest.failure_identity.statement_ordinal, 33);
  assert.equal(
    await readFile(path.join(evidence, "stderr.raw.log"), "utf8"),
    stderr
  );
});

test("failure identity does not guess a migration without an applying line", async () => {
  const { evidence } = await temporaryEvidencePath();
  const result = await captureDiagnosticFailure({
    error: failure({
      stderr: [
        "ERROR: migration failed (SQLSTATE 42702)",
        "statement 33"
      ].join("\n") + "\n"
    }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {},
    snapshot: async (phase) => ({ phase })
  });

  assert.equal(result.manifest.failure_identity.migration, null);
  assert.equal(result.manifest.failure_identity.sqlstate, "42702");
  assert.equal(result.manifest.failure_identity.statement_ordinal, 33);
});

test("evidence directory and every artifact use exact owner-only modes", async () => {
  const { evidence } = await temporaryEvidencePath();
  await captureDiagnosticFailure({
    error: failure({ stdout: "stdout\n", stderr: "stderr\n" }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {},
    snapshot: async () => ({ observation: "PASS" })
  });

  assert.equal((await lstat(evidence)).mode & 0o777, 0o700);
  for (const name of [
    "stdout.raw.log",
    "stderr.raw.log",
    "pre-cleanup-record.json",
    "diagnostic-manifest.json",
    "sanitized-summary.txt"
  ]) {
    const stat = await lstat(path.join(evidence, name));
    assert.equal(stat.isFile(), true);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.mode & 0o777, 0o600);
  }
});

test("existing directory, file, and symlink are never replaced and cleanup runs", async () => {
  for (const kind of ["directory", "loose-directory", "file", "symlink"]) {
    const { parent, evidence } = await temporaryEvidencePath(`evidence-${kind}`);
    if (kind === "directory" || kind === "loose-directory") {
      await mkdir(evidence, { mode: 0o700 });
      if (kind === "loose-directory") {
        await chmod(evidence, 0o755);
      }
    } else if (kind === "file") {
      await writeFile(evidence, "existing", { mode: 0o600 });
    } else {
      const target = path.join(parent, "target");
      await mkdir(target, { mode: 0o700 });
      await symlink(target, evidence);
    }
    let cleanupCount = 0;
    const result = await captureDiagnosticFailure({
      error: failure({ stdout: "stdout", stderr: "stderr" }),
      evidenceDirectory: evidence,
      cliArgs: RESET_ARGS,
      cleanup: async () => {
        cleanupCount += 1;
      },
      snapshot: async () => ({ observation: "PASS" })
    });
    assert.equal(cleanupCount, 1);
    assert.equal(result.manifest.evidence.verdict, "WRITE_FAILED");
    assert.equal(result.manifest.original_child_exit_code, 7);
    if (kind === "loose-directory") {
      assert.equal((await lstat(evidence)).mode & 0o777, 0o755);
    } else if (kind === "file") {
      assert.equal(await readFile(evidence, "utf8"), "existing");
    } else if (kind === "symlink") {
      assert.equal((await lstat(evidence)).isSymbolicLink(), true);
    }
  }
});

test("cleanup failure remains separate from the original child failure", async () => {
  const { evidence } = await temporaryEvidencePath();
  const result = await captureDiagnosticFailure({
    error: failure({ stdout: "stdout", stderr: "stderr", status: 7 }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {
      throw new TypeError("fake cleanup failure");
    },
    snapshot: async (phase) => ({ phase })
  });
  const manifest = await readJson(
    path.join(evidence, "diagnostic-manifest.json")
  );
  assert.equal(manifest.original_child_exit_code, 7);
  assert.equal(manifest.wrapper_public_exit_code, 1);
  assert.equal(manifest.cleanup.verdict, "FAIL");
  assert.equal(manifest.cleanup.error_name, "TypeError");
  assert.equal(result.originalError.status, 7);
  assert.equal(result.cleanupError.name, "TypeError");
});

const secretCases = [
  ["PostgreSQL URL", "postgresql://role:password@127.0.0.1:54322/postgres"],
  ["password URI", "https://role:password@example.invalid/resource"],
  ["PostgreSQL password", "POSTGRES_PASSWORD=DO_NOT_STORE"],
  ["database password", "DATABASE_PASSWORD: DO_NOT_STORE"],
  ["generic database password label", "password=DO_NOT_STORE"],
  [
    "N5 URL variable",
    "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL=DO_NOT_STORE"
  ],
  [
    "N5 CA variable",
    "KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM=DO_NOT_STORE"
  ],
  ["Supabase access key", "sbp_abcdefghijklmnopqrstuvwxyz"],
  ["Supabase secret key", "sb_secret_abcdefghijklmnopqrstuvwxyz"],
  ["Supabase publishable key", "sb_publishable_abcdefghijklmnopqrstuvwxyz"],
  ["Authorization header", "Authorization: Bearer DO_NOT_STORE"],
  [
    "prefixed Authorization header",
    'headers={"Authorization":"Bearer DO_NOT_STORE"}'
  ],
  ["Cookie", "Cookie: session=DO_NOT_STORE"],
  ["JSON Cookie", '{"Cookie":"session=DO_NOT_STORE"}'],
  [
    "JWT",
    "eyJabcdefghijk.eyJabcdefghijk.abcdefghijklmnop"
  ],
  ["PEM", "-----BEGIN CERTIFICATE-----\nDO_NOT_STORE"],
  [
    "environment dump",
    "FIRST=value\nSECOND=value\nTHIRD=value"
  ],
  [
    "export environment dump",
    " export FIRST=value\nexport SECOND=value\n  THIRD=value"
  ],
  [
    "JSON environment dump",
    '{"FIRST":"value","SECOND":"value","THIRD":"value"}'
  ]
];

for (const [name, secret] of secretCases) {
  test(`secret scan withholds raw artifacts for ${name}`, async () => {
    const { evidence } = await temporaryEvidencePath();
    let cleanupCount = 0;
    const result = await captureDiagnosticFailure({
      error: failure({ stdout: `before\n${secret}\nafter\n`, stderr: "" }),
      evidenceDirectory: evidence,
      cliArgs: RESET_ARGS,
      cleanup: async () => {
        cleanupCount += 1;
      },
      snapshot: async (phase) => ({ phase })
    });
    assert.equal(cleanupCount, 1);
    assert.equal(result.manifest.secret_scan.verdict, "FAIL");
    assert.equal(result.manifest.evidence.verdict, "RAW_LOG_WITHHELD");
    assert.deepEqual(result.manifest.stdout, {
      file: null,
      stored: false
    });
    assert.deepEqual(result.manifest.stderr, {
      file: null,
      stored: false
    });
    assert.equal(result.manifest.combined_log_sha256, null);
    assert.equal(result.manifest.failure_identity, null);
    await assert.rejects(
      readFile(path.join(evidence, "stdout.raw.log")),
      /ENOENT/
    );
    await assert.rejects(
      readFile(path.join(evidence, "stderr.raw.log")),
      /ENOENT/
    );
    const manifestText = await readFile(
      path.join(evidence, "diagnostic-manifest.json"),
      "utf8"
    );
    const summaryText = await readFile(
      path.join(evidence, "sanitized-summary.txt"),
      "utf8"
    );
    assert.equal(manifestText.includes("DO_NOT_STORE"), false);
    assert.equal(summaryText.includes("DO_NOT_STORE"), false);
    assert.equal(summaryText.includes("sha256="), false);
    assert.match(summaryText, /stdout: WITHHELD/);
    assert.match(summaryText, /stderr: WITHHELD/);
    assert.equal(
      Object.values(result.manifest.secret_scan.detections)
        .every((count) => Number.isInteger(count) && count > 0),
      true
    );
  });
}

test("known credential values are detected without recording the value", async () => {
  const { evidence } = await temporaryEvidencePath();
  const knownValue = "known-credential-value";
  const result = await captureDiagnosticFailure({
    error: failure({ stdout: `failure ${knownValue}`, stderr: "" }),
    evidenceDirectory: evidence,
    cliArgs: RESET_ARGS,
    cleanup: async () => {},
    snapshot: async (phase) => ({ phase }),
    knownValues: [knownValue]
  });
  assert.deepEqual(result.manifest.secret_scan.detections, {
    known_credential_value: 1
  });
  const manifestText = await readFile(
    path.join(evidence, "diagnostic-manifest.json"),
    "utf8"
  );
  assert.equal(manifestText.includes(knownValue), false);
});

test("success and non-diagnostic invocations have no evidence path", () => {
  const reset = parseWrapperArguments(RESET_ARGS);
  const migrationList = parseWrapperArguments([
    "migration",
    "list",
    "--local"
  ]);
  assert.equal(reset.diagnosticDirectory, null);
  assert.equal(migrationList.diagnosticDirectory, null);
  assert.deepEqual(reset.cliArgs, RESET_ARGS);
  assert.deepEqual(migrationList.cliArgs, [
    "migration",
    "list",
    "--local"
  ]);
});

test("fake child success creates no failure artifact", async () => {
  const { evidence } = await temporaryEvidencePath();
  const result = await runChildForFailureRouting(async () => ({
    status: 0,
    stdout: "success",
    stderr: ""
  }));
  assert.equal(result.failure, null);
  assert.deepEqual(result.result, {
    status: 0,
    stdout: "success",
    stderr: ""
  });
  await assert.rejects(lstat(evidence), /ENOENT/);
});

test("only the exact nonzero child failure enters diagnostic capture", async () => {
  const childError = failure({ status: 7 });
  const child = await runChildForFailureRouting(async () => {
    throw childError;
  });
  const order = [];
  const summary = await routeLocalCommandFailure({
    error: child.failure,
    childFailure: child.failure,
    diagnosticDirectory: "/private/tmp/human-selected/evidence",
    cliArgs: RESET_ARGS,
    needsDockerCreateGuard: true,
    captureDiagnostic: async ({ error, cleanup }) => {
      order.push(`capture:${error.status}`);
      await cleanup();
      return { summary: "diagnostic summary" };
    },
    cleanup: async () => {
      order.push("cleanup");
    },
    sanitize: () => {
      throw new Error("sanitize must not run");
    }
  });
  assert.equal(summary, "diagnostic summary");
  assert.deepEqual(order, ["capture:7", "cleanup"]);
});

test("wrapper and spawn failures never masquerade as child nonzero evidence", async () => {
  for (const wrapperError of [
    Object.assign(new Error("postflight failure"), { status: 1 }),
    Object.assign(new Error("spawn failure"), { code: "ENOENT" })
  ]) {
    let captureCount = 0;
    let cleanupCount = 0;
    const summary = await routeLocalCommandFailure({
      error: wrapperError,
      childFailure:
        wrapperError.code === "ENOENT" ? wrapperError : null,
      diagnosticDirectory: "/private/tmp/human-selected/evidence",
      cliArgs: RESET_ARGS,
      needsDockerCreateGuard: true,
      captureDiagnostic: async () => {
        captureCount += 1;
        return { summary: "must not capture" };
      },
      cleanup: async () => {
        cleanupCount += 1;
      },
      sanitize: (error) => `sanitized:${error.message}`
    });
    assert.equal(captureCount, 0);
    assert.equal(cleanupCount, 1);
    assert.equal(summary, `sanitized:${wrapperError.message}`);
  }
});

test("normal reset and non-reset failure routing stays unchanged", async () => {
  const childError = failure({ status: 7 });
  let resetCleanup = 0;
  let captureCount = 0;
  const resetSummary = await routeLocalCommandFailure({
    error: childError,
    childFailure: childError,
    diagnosticDirectory: null,
    cliArgs: RESET_ARGS,
    needsDockerCreateGuard: true,
    captureDiagnostic: async () => {
      captureCount += 1;
      return { summary: "must not capture" };
    },
    cleanup: async () => {
      resetCleanup += 1;
    },
    sanitize: () => "normal reset failure"
  });
  assert.equal(resetSummary, "normal reset failure");
  assert.equal(resetCleanup, 1);
  assert.equal(captureCount, 0);

  let nonResetCleanup = 0;
  const nonResetSummary = await routeLocalCommandFailure({
    error: childError,
    childFailure: childError,
    diagnosticDirectory: null,
    cliArgs: ["migration", "list", "--local"],
    needsDockerCreateGuard: false,
    cleanup: async () => {
      nonResetCleanup += 1;
    },
    assertBindings: () => {},
    sanitize: () => "normal non-reset failure"
  });
  assert.equal(nonResetSummary, "normal non-reset failure");
  assert.equal(nonResetCleanup, 0);

  const bindingSummary = await routeLocalCommandFailure({
    error: childError,
    childFailure: childError,
    diagnosticDirectory: null,
    cliArgs: ["migration", "list", "--local"],
    needsDockerCreateGuard: false,
    cleanup: async () => {
      nonResetCleanup += 1;
    },
    assertBindings: () => {
      throw new Error("unsafe binding");
    },
    sanitize: () => "binding failure"
  });
  assert.equal(bindingSummary, "binding failure");
  assert.equal(nonResetCleanup, 1);
});

test("secret detector reports categories and counts only", () => {
  const detections = inspectDiagnosticSecrets(
    "Authorization: Bearer one\nAuthorization: Bearer two",
    "Cookie: first=value\nCookie: second=value"
  );
  assert.deepEqual(detections, {
    authorization_header: 2,
    cookie_header: 2
  });
  assert.deepEqual(
    inspectDiagnosticSecrets(
      "password: NULL\nDATABASE_PASSWORD=absent",
      ""
    ),
    {}
  );
  assert.deepEqual(
    inspectDiagnosticSecrets(
      "ERROR: permission denied\nDETAIL: diagnostic detail\nHINT: retry is disabled\nCONTEXT: SQL statement\nThe environment remains local.",
      ""
    ),
    {}
  );
  assert.deepEqual(
    inspectDiagnosticSecrets(
      "{ERROR: permission denied, DETAIL: diagnostic detail, HINT: diagnostic hint}",
      ""
    ),
    {}
  );
  assert.deepEqual(
    inspectDiagnosticSecrets(
      "FIRST_VALUE=one\nSECOND_VALUE=two\nTHIRD_VALUE=three",
      ""
    ),
    { environment_dump: 3 }
  );
  assert.deepEqual(
    inspectDiagnosticSecrets(
      [
        "{",
        '  "FIRST_VALUE": "one",',
        '  "SECOND_VALUE": "two",',
        '  "THIRD_VALUE": "three"',
        "}"
      ].join("\n"),
      ""
    ),
    { environment_dump: 3 }
  );
});

test("pgTAP diagnostic flag is exact, explicit, and removed from CLI args", () => {
  const evidence = "/private/tmp/human-selected/pgtap-evidence";
  assert.deepEqual(
    parseWrapperArguments([
      ...PGTAP_ARGS,
      "--wtv-pgtap-diagnostic-dir",
      evidence
    ]),
    {
      cliArgs: PGTAP_ARGS,
      command: "test db",
      diagnosticDirectory: evidence,
      diagnosticMode: "pgtap"
    }
  );
  for (const args of [
    ["test", "db", "--local", "--wtv-pgtap-diagnostic-dir", evidence],
    [
      "test",
      "db",
      "--local",
      "outside.sql",
      "--wtv-pgtap-diagnostic-dir",
      evidence
    ],
    [...PGTAP_ARGS, "--debug", "--wtv-pgtap-diagnostic-dir", evidence],
    [...RESET_ARGS, "--wtv-pgtap-diagnostic-dir", evidence],
    [...PGTAP_ARGS, "--wtv-pgtap-diagnostic-dir"],
    [
      ...PGTAP_ARGS,
      "--wtv-pgtap-diagnostic-dir",
      evidence,
      "--wtv-reset-diagnostic-dir",
      `${evidence}-2`
    ]
  ]) {
    assert.throws(() => parseWrapperArguments(args));
  }
});

test("successful pgTAP child creates no failure diagnostic directory", async () => {
  const { evidence } = await temporaryEvidencePath("pgtap-success");
  const parsed = parseWrapperArguments([
    ...PGTAP_ARGS,
    "--wtv-pgtap-diagnostic-dir",
    evidence
  ]);
  const result = await runChildForFailureRouting(async () => ({
    status: 0,
    stdout: "all tests successful\n",
    stderr: ""
  }));
  assert.equal(parsed.diagnosticMode, "pgtap");
  assert.equal(result.failure, null);
  await assert.rejects(lstat(evidence), /ENOENT/);
});

test("pgTAP extraction keeps order, results, failure values, SQL error, and Bad plan context", () => {
  const stdout = [
    `${PGTAP_FILES[0]} .. ok`,
    `${PGTAP_FILES[1]} .. not ok`,
    "1..34",
    "ok 1 - first",
    "not ok 2 - role remains least privilege",
    "# have: true",
    "# want: false",
    "SELECT throws_ok('query');",
    "Bad plan.  You planned 34 tests but ran 2."
  ].join("\n") + "\n";
  const stderr = [
    "psql:test.sql:10: ERROR: permission denied (SQLSTATE 42501)",
    "DETAIL: diagnostic detail",
    "HINT: diagnostic hint",
    "CONTEXT: diagnostic context"
  ].join("\n") + "\n";
  const result = extractPgTapFailureIdentity(stdout, stderr, PGTAP_FILES);

  assert.deepEqual(result.test_file_order, PGTAP_FILES);
  assert.deepEqual(result.file_results, [
    { file: PGTAP_FILES[0], result: "PASS" },
    { file: PGTAP_FILES[1], result: "FAIL" },
    { file: PGTAP_FILES[2], result: null }
  ]);
  assert.equal(result.plan_count, 34);
  assert.equal(result.observed_test_count, 2);
  assert.equal(result.first_failed_assertion_number, 2);
  assert.equal(result.assertion_description, "role remains least privilege");
  assert.equal(result.actual, "true");
  assert.equal(result.expected, "false");
  assert.equal(result.sqlstate, "42501");
  assert.equal(result.error, "permission denied (SQLSTATE 42501)");
  assert.equal(result.detail, "diagnostic detail");
  assert.equal(result.hint, "diagnostic hint");
  assert.equal(result.context, "diagnostic context");
  assert.equal(
    result.bad_plan_context,
    "SELECT throws_ok('query');\nBad plan.  You planned 34 tests but ran 2."
  );
});

test("pgTAP diagnostic stores complete separate streams and combined view without stack lifecycle changes", async () => {
  const { evidence } = await temporaryEvidencePath("pgtap-evidence");
  const stdout = [
    `${PGTAP_FILES[0]} .. ok`,
    ...Array.from({ length: 30 }, (_, index) => `stdout-${index}`),
    "not ok 7 - first failure"
  ].join("\n") + "\n";
  const stderr = [
    "ERROR: first cause (SQLSTATE 42702)",
    "DETAIL: diagnostic detail",
    "HINT: diagnostic hint",
    "CONTEXT: diagnostic context",
    "SQLSTATE: 42702",
    "LINE: 23",
    "NOTICE: diagnostic notice",
    ...Array.from({ length: 30 }, (_, index) => `stderr-${index}`)
  ].join("\n") + "\n";
  let stackDispositionCount = 0;
  const preExecution = { observation: "PASS", target: "localhost-only" };
  const result = await captureDiagnosticFailure({
    error: failure({ stdout, stderr, status: 7 }),
    evidenceDirectory: evidence,
    cliArgs: PGTAP_ARGS,
    diagnosticMode: "pgtap",
    preExecution,
    cleanup: async () => {
      stackDispositionCount += 1;
    },
    snapshot: async (phase) => ({ phase })
  });

  assert.equal(stackDispositionCount, 1);
  assert.equal(
    await readFile(path.join(evidence, "stdout.raw.log"), "utf8"),
    stdout
  );
  assert.equal(
    await readFile(path.join(evidence, "stderr.raw.log"), "utf8"),
    stderr
  );
  const tap = await readFile(
    path.join(evidence, "tap-combined-view.log"),
    "utf8"
  );
  assert.equal(
    tap,
    `===== STDOUT =====\n${stdout}\n===== STDERR =====\n${stderr}`
  );
  const manifest = await readJson(
    path.join(evidence, "diagnostic-manifest.json")
  );
  assert.equal(manifest.contract, "N5_PGTAP_FAILURE_DIAGNOSTIC_v1");
  assert.equal(manifest.diagnostic_mode, "pgtap");
  assert.deepEqual(manifest.pre_execution, preExecution);
  assert.deepEqual(manifest.command.arguments, [
    ...PGTAP_ARGS,
    "--network-id",
    "where-to-visit-supabase-local"
  ]);
  assert.equal(manifest.original_child_exit_code, 7);
  assert.equal(manifest.wrapper_public_exit_code, 1);
  assert.equal(manifest.command.retry_count, 0);
  assert.equal(manifest.stdout.bytes, Buffer.byteLength(stdout));
  assert.equal(manifest.stderr.bytes, Buffer.byteLength(stderr));
  assert.equal(manifest.artifacts.tap_combined_view.stored, true);
  assert.equal(manifest.failure_identity.first_failed_assertion_number, 7);
  assert.equal(manifest.cleanup.verdict, "PASS");
  assert.match(result.summary, /N5 pgtap diagnostic child exit: 7/);
});

test("pgTAP diagnostic evidence uses 0700 directory and 0600 regular files", async () => {
  const { evidence } = await temporaryEvidencePath("pgtap-modes");
  await captureDiagnosticFailure({
    error: failure({ stdout: "not ok 1 - failure\n", stderr: "" }),
    evidenceDirectory: evidence,
    cliArgs: PGTAP_ARGS,
    diagnosticMode: "pgtap",
    cleanup: async () => {},
    snapshot: async () => ({ observation: "PASS" })
  });

  assert.equal((await lstat(evidence)).mode & 0o777, 0o700);
  for (const name of [
    "stdout.raw.log",
    "stderr.raw.log",
    "tap-combined-view.log",
    "pre-cleanup-record.json",
    "diagnostic-manifest.json",
    "sanitized-summary.txt"
  ]) {
    const stat = await lstat(path.join(evidence, name));
    assert.equal(stat.isFile(), true);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.mode & 0o777, 0o600);
  }
});

test("pgTAP diagnostic secret detection withholds every raw TAP artifact", async () => {
  for (const secret of [
    "postgresql://role:password@127.0.0.1:54322/postgres",
    "POSTGRES_PASSWORD=DO_NOT_STORE",
    "Cookie: session=DO_NOT_STORE",
    "eyJabcdefghijk.eyJabcdefghijk.abcdefghijklmnop",
    "-----BEGIN CERTIFICATE-----\nDO_NOT_STORE"
  ]) {
    const { evidence } = await temporaryEvidencePath("pgtap-secret");
    const result = await captureDiagnosticFailure({
      error: failure({ stdout: `not ok 1\n${secret}\n`, stderr: "" }),
      evidenceDirectory: evidence,
      cliArgs: PGTAP_ARGS,
      diagnosticMode: "pgtap",
      cleanup: async () => {},
      snapshot: async () => ({ observation: "PASS" })
    });
    assert.equal(result.manifest.evidence.verdict, "RAW_LOG_WITHHELD");
    assert.equal(result.manifest.failure_identity, null);
    for (const name of [
      "stdout.raw.log",
      "stderr.raw.log",
      "tap-combined-view.log"
    ]) {
      await assert.rejects(readFile(path.join(evidence, name)), /ENOENT/);
    }
    const manifest = await readFile(
      path.join(evidence, "diagnostic-manifest.json"),
      "utf8"
    );
    assert.equal(manifest.includes("DO_NOT_STORE"), false);
    assert.equal(manifest.includes("password@"), false);
  }
});

test("pgTAP diagnostic rejects existing evidence and preserves wrapper exit semantics", async () => {
  const { evidence } = await temporaryEvidencePath("pgtap-existing");
  await mkdir(evidence, { mode: 0o700 });
  let stackDispositionCount = 0;
  const result = await captureDiagnosticFailure({
    error: failure({ stdout: "not ok 1\n", status: 7 }),
    evidenceDirectory: evidence,
    cliArgs: PGTAP_ARGS,
    diagnosticMode: "pgtap",
    cleanup: async () => {
      stackDispositionCount += 1;
    },
    snapshot: async () => ({ observation: "PASS" })
  });
  assert.equal(stackDispositionCount, 1);
  assert.equal(result.manifest.evidence.verdict, "WRITE_FAILED");
  assert.equal(result.manifest.original_child_exit_code, 7);
  assert.equal(result.manifest.wrapper_public_exit_code, 1);
});

test("pgTAP diagnostic routing captures only child nonzero without retry or pipelines", async () => {
  const childError = failure({ status: 7 });
  let captureCount = 0;
  let dispositionCount = 0;
  const summary = await routeLocalCommandFailure({
    error: childError,
    childFailure: childError,
    diagnosticDirectory: "/private/tmp/human-selected/pgtap",
    diagnosticMode: "pgtap",
    cliArgs: PGTAP_ARGS,
    needsDockerCreateGuard: false,
    preExecution: { observation: "PASS" },
    captureDiagnostic: async (input) => {
      captureCount += 1;
      assert.equal(input.diagnosticMode, "pgtap");
      assert.deepEqual(input.preExecution, { observation: "PASS" });
      assert.deepEqual(input.cliArgs, PGTAP_ARGS);
      await input.cleanup();
      return { summary: "pgtap diagnostic summary" };
    },
    cleanup: async () => {
      dispositionCount += 1;
    },
    sanitize: () => {
      throw new Error("sanitize must not run");
    }
  });
  assert.equal(summary, "pgtap diagnostic summary");
  assert.equal(captureCount, 1);
  assert.equal(dispositionCount, 1);
  assert.equal(PGTAP_ARGS.some((argument) => /[|;]/.test(argument)), false);
});
