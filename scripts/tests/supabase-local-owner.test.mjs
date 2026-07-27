import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyLocalStackOwnerForTest,
  LOCAL_STACK_OWNER_STATES,
  LocalStackOwnerError,
  selectLocalDbContainer
} from "../lib/supabase-local.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const cleanupScript = path.join(repoRoot, "scripts", "supabase-local-cleanup-sql.mjs");
const networkName = "where-to-visit-supabase-local";

function studioContainer(root, overrides = {}) {
  const snippets = path.join(root, "supabase", "snippets");
  return {
    id: "studio-id",
    name: "supabase_studio_Where-to-Visit",
    service: "studio",
    running: true,
    networks: [networkName],
    published: [],
    mounts: [{
      type: "bind",
      source: snippets,
      destination: snippets,
      readWrite: true
    }],
    ...overrides
  };
}

function dbContainer(overrides = {}) {
  return {
    id: "db-id",
    name: "supabase_db_Where-to-Visit",
    service: "db",
    running: true,
    networks: [networkName],
    published: [],
    mounts: [],
    ...overrides
  };
}

test("classifies the five fixed local stack owner states", async () => {
  const foreignRoot = await mkdtemp("/private/tmp/local-owner-foreign-");
  const orphanedRoot = path.join(foreignRoot, "missing");
  try {
    assert.equal(
      classifyLocalStackOwnerForTest([], repoRoot).state,
      LOCAL_STACK_OWNER_STATES.ABSENT
    );
    assert.equal(
      classifyLocalStackOwnerForTest(
        [studioContainer(repoRoot), dbContainer()],
        repoRoot
      ).state,
      LOCAL_STACK_OWNER_STATES.CURRENT
    );
    assert.equal(
      classifyLocalStackOwnerForTest(
        [studioContainer(foreignRoot), dbContainer()],
        repoRoot
      ).state,
      LOCAL_STACK_OWNER_STATES.FOREIGN
    );
    assert.equal(
      classifyLocalStackOwnerForTest(
        [studioContainer(orphanedRoot), dbContainer()],
        repoRoot
      ).state,
      LOCAL_STACK_OWNER_STATES.ORPHANED
    );
    assert.equal(
      classifyLocalStackOwnerForTest([dbContainer()], repoRoot).state,
      LOCAL_STACK_OWNER_STATES.INDETERMINATE
    );
  } finally {
    await rm(foreignRoot, { recursive: true });
  }
});

test("rejects duplicate Studio, multiple candidates, and tuple mismatches", () => {
  const studio = studioContainer(repoRoot);
  const duplicate = { ...studio, id: "studio-two" };
  assert.equal(
    classifyLocalStackOwnerForTest([studio, duplicate], repoRoot).state,
    LOCAL_STACK_OWNER_STATES.INDETERMINATE
  );
  assert.equal(
    classifyLocalStackOwnerForTest(
      [{ ...studio, mounts: [...studio.mounts, ...studio.mounts] }],
      repoRoot
    ).state,
    LOCAL_STACK_OWNER_STATES.INDETERMINATE
  );

  const mismatches = [
    { mounts: [] },
    { mounts: [{ ...studio.mounts[0], type: "volume" }] },
    { mounts: [{ ...studio.mounts[0], readWrite: false }] },
    { mounts: [{ ...studio.mounts[0], source: "supabase/snippets" }] },
    { mounts: [{ ...studio.mounts[0], destination: "/different" }] },
    {
      mounts: [{
        ...studio.mounts[0],
        source: path.join(repoRoot, "supabase", "other"),
        destination: path.join(repoRoot, "supabase", "other")
      }]
    }
  ];
  for (const mismatch of mismatches) {
    assert.equal(
      classifyLocalStackOwnerForTest([{ ...studio, ...mismatch }], repoRoot).state,
      LOCAL_STACK_OWNER_STATES.INDETERMINATE
    );
  }
});

test("classifies current-root and candidate-root resolution errors", () => {
  const studio = studioContainer(repoRoot);
  assert.equal(
    classifyLocalStackOwnerForTest(
      [studio],
      repoRoot,
      (directory) => {
        if (directory === repoRoot) {
          const error = new Error("denied");
          error.code = "EACCES";
          throw error;
        }
        return directory;
      }
    ).state,
    LOCAL_STACK_OWNER_STATES.INDETERMINATE
  );
  assert.equal(
    classifyLocalStackOwnerForTest(
      [studio],
      "/canonical-current",
      (directory) => {
        if (directory === repoRoot) {
          const error = new Error("denied");
          error.code = "EACCES";
          throw error;
        }
        return directory;
      }
    ).state,
    LOCAL_STACK_OWNER_STATES.INDETERMINATE
  );
});

test("owner rejection is typed before DB safe-condition evaluation", () => {
  assert.throws(
    () => selectLocalDbContainer([]),
    (error) =>
      error instanceof LocalStackOwnerError &&
      error.ownerState === LOCAL_STACK_OWNER_STATES.ABSENT
  );
  assert.throws(
    () => selectLocalDbContainer([dbContainer()]),
    (error) =>
      error instanceof LocalStackOwnerError &&
      error.ownerState === LOCAL_STACK_OWNER_STATES.INDETERMINATE
  );
});

test("cleanup entrypoint rejects non-CURRENT owners without runtime mutation", async (t) => {
  const root = await mkdtemp("/private/tmp/local-owner-entrypoint-");
  const bin = path.join(root, "bin");
  const fakeDocker = path.join(bin, "docker");
  const log = path.join(root, "docker-log.jsonl");
  const sqlFile = path.join(root, "cleanup.sql");
  const rollbackSql = "BEGIN;\nselect 1;\nROLLBACK;\n";
  const sqlSha = createHash("sha256").update(rollbackSql).digest("hex");
  const profileMarker = path.join(repoRoot, ".env.supabase.local");
  await mkdir(bin);
  await writeFile(
    fakeDocker,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_DOCKER_LOG, JSON.stringify(args) + "\\n");
const ownerCase = process.env.FAKE_OWNER_CASE;
const root = process.env.FAKE_STACK_ROOT;
const network = "where-to-visit-supabase-local";
const ports = {};
for (const port of [54321, 54322, 54323, 54324, 54327]) {
  ports[String(port) + "/tcp"] = [{
    HostIp: ownerCase === "FOREIGN" ? "0.0.0.0" : "127.0.0.1",
    HostPort: String(port)
  }];
}
const mount = {
  Type: "bind",
  Source: root + "/supabase/snippets",
  Destination: root + "/supabase/snippets",
  RW: ownerCase !== "INDETERMINATE"
};
const containers = [
  {
    Id: "studio-id",
    Name: "/supabase_studio_Where-to-Visit",
    Config: {
      Env: ["SUPABASE_ANON_KEY=DO_NOT_LEAK_OWNER_TEST"],
      Labels: { "com.supabase.cli.project": "Where-to-Visit", "com.supabase.cli.service": "studio" }
    },
    State: { Running: true },
    NetworkSettings: { Networks: { [network]: {} }, Ports: ports },
    Mounts: [mount]
  },
  {
    Id: "db-id",
    Name: "/supabase_db_Where-to-Visit",
    Config: { Labels: { "com.supabase.cli.project": "Where-to-Visit", "com.supabase.cli.service": "db" } },
    State: { Running: true },
    NetworkSettings: { Networks: { [network]: {} }, Ports: {} },
    Mounts: []
  }
];
if (args[0] === "ps") {
  if (ownerCase === "INSPECTION_ERROR") process.exit(9);
  if (ownerCase !== "ABSENT") process.stdout.write("studio-id\\ndb-id\\n");
} else if (args[0] === "inspect") {
  process.stdout.write(JSON.stringify(containers));
} else if (args[0] === "exec") {
  process.stdin.resume();
  process.stdin.on("end", () => process.stdout.write("cleanup-ok\\n"));
} else if (args[0] === "network" && args[1] === "inspect") {
  process.exit(1);
}
`,
    { mode: 0o700 }
  );
  await chmod(fakeDocker, 0o700);
  await writeFile(sqlFile, rollbackSql, { mode: 0o600 });

  try {
    for (const ownerCase of [
      "ABSENT",
      "FOREIGN",
      "ORPHANED",
      "INDETERMINATE",
      "INSPECTION_ERROR"
    ]) {
      await t.test(ownerCase, async () => {
        await writeFile(profileMarker, "OWNER_GUARD_TEST=1\n", {
          mode: 0o600,
          flag: "wx"
        });
        await writeFile(log, "");
        const stackRoot =
          ownerCase === "FOREIGN"
            ? root
            : ownerCase === "ORPHANED"
              ? path.join(root, "missing")
              : repoRoot;
        const result = spawnSync(
          process.execPath,
          [
            cleanupScript,
            "--mode",
            "rollback",
            "--file",
            sqlFile,
            "--sha256",
            sqlSha
          ],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH}`,
              FAKE_DOCKER_LOG: log,
              FAKE_OWNER_CASE: ownerCase,
              FAKE_STACK_ROOT: stackRoot
            }
          }
        );
        assert.equal(result.status, 1);
        assert.match(
          result.stderr,
          /owner state is (ABSENT|FOREIGN|ORPHANED|INDETERMINATE)/
        );
        assert.equal(result.stderr.includes(root), false);
        assert.equal(result.stderr.includes("DO_NOT_LEAK_OWNER_TEST"), false);
        assert.equal(
          await readFile(profileMarker, "utf8"),
          "OWNER_GUARD_TEST=1\n"
        );
        const calls = (await readFile(log, "utf8"))
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        assert.equal(calls.some((args) => args[0] === "exec"), false);
        assert.equal(calls.some((args) => args[0] === "rm"), false);
        assert.equal(calls.some((args) => args[0] === "stop"), false);
        assert.equal(calls.some((args) => args[0] === "network"), false);
        assert.equal(calls.filter((args) => args[0] === "ps").length, 1);
        await rm(profileMarker);
      });
    }
  } finally {
    await rm(profileMarker, { force: true });
    await rm(root, { recursive: true });
  }
});

test("cleanup entrypoint preserves the CURRENT execution path", async () => {
  const root = await mkdtemp("/private/tmp/local-owner-current-");
  const bin = path.join(root, "bin");
  const fakeDocker = path.join(bin, "docker");
  const log = path.join(root, "docker-log.jsonl");
  const sqlFile = path.join(root, "cleanup.sql");
  const rollbackSql = "BEGIN;\nselect 1;\nROLLBACK;\n";
  const sqlSha = createHash("sha256").update(rollbackSql).digest("hex");
  await mkdir(bin);
  await writeFile(
    fakeDocker,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_DOCKER_LOG, JSON.stringify(args) + "\\n");
const root = process.env.FAKE_STACK_ROOT;
const network = "where-to-visit-supabase-local";
const ports = {};
for (const port of [54321, 54322, 54323, 54324, 54327]) {
  ports[String(port) + "/tcp"] = [{ HostIp: "127.0.0.1", HostPort: String(port) }];
}
if (args[0] === "ps") {
  process.stdout.write("studio-id\\ndb-id\\n");
} else if (args[0] === "inspect") {
  process.stdout.write(JSON.stringify([
    {
      Id: "studio-id",
      Name: "/supabase_studio_Where-to-Visit",
      Config: { Labels: { "com.supabase.cli.project": "Where-to-Visit", "com.supabase.cli.service": "studio" } },
      State: { Running: true },
      NetworkSettings: { Networks: { [network]: {} }, Ports: ports },
      Mounts: [{ Type: "bind", Source: root + "/supabase/snippets", Destination: root + "/supabase/snippets", RW: true }]
    },
    {
      Id: "db-id",
      Name: "/supabase_db_Where-to-Visit",
      Config: { Labels: { "com.supabase.cli.project": "Where-to-Visit", "com.supabase.cli.service": "db" } },
      State: { Running: true },
      NetworkSettings: { Networks: { [network]: {} }, Ports: {} },
      Mounts: []
    }
  ]));
} else if (args[0] === "exec") {
  process.stdin.resume();
  process.stdin.on("end", () => process.stdout.write("cleanup-ok\\n"));
}
`,
    { mode: 0o700 }
  );
  await chmod(fakeDocker, 0o700);
  await writeFile(sqlFile, rollbackSql, { mode: 0o600 });
  try {
    const result = spawnSync(
      process.execPath,
      [
        cleanupScript,
        "--mode",
        "rollback",
        "--file",
        sqlFile,
        "--sha256",
        sqlSha
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          FAKE_DOCKER_LOG: log,
          FAKE_STACK_ROOT: repoRoot
        }
      }
    );
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Local cleanup rollback completed/);
    const calls = (await readFile(log, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(calls.filter((args) => args[0] === "exec").length, 1);
    assert.equal(calls.some((args) => args[0] === "rm"), false);
    assert.equal(calls.some((args) => args[0] === "network"), false);
  } finally {
    await rm(root, { recursive: true });
  }
});
