import assert from "node:assert/strict";
import {
  chmod,
  chown,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import {
  createN5EventCreatorLocalProfile,
  inspectN5EventCreatorLocalProfile,
  loadN5EventCreatorLocalProfile,
  N5_DATABASE_CA_KEY,
  N5_DATABASE_URL_KEY,
  N5_LOCAL_PROFILE_NAME,
  quarantineN5EventCreatorLocalProfile,
  sanitizedN5EventCreatorEnvironment
} from "../lib/n5-event-creator-local-profile.mjs";

const LOCAL_URL =
  "postgresql://kimenosuke_event_creator:test-password@127.0.0.1:54322/postgres";
const GENERATED_PASSWORD = "A".repeat(43);
const temporaryRoots = new Set();

after(async () => {
  await Promise.all(
    [...temporaryRoots].map((root) =>
      rm(root, { recursive: true, force: false })
    )
  );
});

async function temporaryRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "n5-local-profile-"));
  temporaryRoots.add(root);
  return root;
}

test("returns null when the local profile is absent", async () => {
  assert.equal(
    await loadN5EventCreatorLocalProfile(await temporaryRoot()),
    null
  );
});

test("accepts one exact key in a 0600 regular file", async () => {
  const root = await temporaryRoot();
  const profilePath = path.join(root, N5_LOCAL_PROFILE_NAME);
  await writeFile(profilePath, `${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n`, {
    mode: 0o600
  });
  await chmod(profilePath, 0o600);
  await chown(profilePath, process.getuid(), process.getgid());

  assert.deepEqual(await loadN5EventCreatorLocalProfile(root), {
    [N5_DATABASE_URL_KEY]: LOCAL_URL
  });
});

test("exclusively creates one owner-only local credential profile", async () => {
  const root = await temporaryRoot();
  const result = await createN5EventCreatorLocalProfile(
    root,
    GENERATED_PASSWORD
  );
  const profilePath = path.join(root, N5_LOCAL_PROFILE_NAME);
  const stats = await lstat(profilePath);
  const contents = await readFile(profilePath, "utf8");

  assert.equal(result.profilePath, profilePath);
  assert.equal(result.mode, 0o600);
  assert.equal(result.keyCount, 1);
  assert.equal(result.finalNewline, true);
  assert.equal(stats.isFile(), true);
  assert.equal(stats.isSymbolicLink(), false);
  assert.equal(stats.mode & 0o777, 0o600);
  assert.equal(stats.uid, process.getuid());
  assert.equal(stats.gid, process.getgid());
  assert.equal(contents.endsWith("\n"), true);
  assert.equal(contents.split("\n").filter(Boolean).length, 1);
  assert.equal(contents.includes(N5_DATABASE_CA_KEY), false);
  assert.deepEqual(await loadN5EventCreatorLocalProfile(root), {
    [N5_DATABASE_URL_KEY]:
      `postgresql://kimenosuke_event_creator:${GENERATED_PASSWORD}` +
      "@127.0.0.1:54322/postgres"
  });
});

test("profile creation rejects invalid generated values without creating a file", async () => {
  for (const password of ["", "short", "A".repeat(42), `${"A".repeat(42)}=`]) {
    const root = await temporaryRoot();
    await assert.rejects(
      createN5EventCreatorLocalProfile(root, password),
      /N5 local Event creator credential provisioning failed\./
    );
    await assert.rejects(
      lstat(path.join(root, N5_LOCAL_PROFILE_NAME)),
      /ENOENT/
    );
  }
});

test("profile creation never replaces an existing file or symlink", async () => {
  for (const kind of ["file", "symlink"]) {
    const root = await temporaryRoot();
    const profilePath = path.join(root, N5_LOCAL_PROFILE_NAME);
    if (kind === "file") {
      await writeFile(profilePath, "existing\n", { mode: 0o600 });
    } else {
      const target = path.join(root, "credential-source");
      await writeFile(target, "existing\n", { mode: 0o600 });
      await symlink(target, profilePath);
    }

    await assert.rejects(
      createN5EventCreatorLocalProfile(root, GENERATED_PASSWORD),
      /N5 local Event creator credential provisioning failed\./
    );
    if (kind === "file") {
      assert.equal(await readFile(profilePath, "utf8"), "existing\n");
    } else {
      assert.equal((await lstat(profilePath)).isSymbolicLink(), true);
    }
  }
});

test("inspects and atomically quarantines a validated profile without replacement", async () => {
  const root = await temporaryRoot();
  const quarantineRoot = path.join(root, "quarantine");
  const quarantineDirectory = path.join(quarantineRoot, "rotation-1");
  await mkdir(quarantineRoot, { mode: 0o700 });
  await chmod(quarantineRoot, 0o700);
  await createN5EventCreatorLocalProfile(root, GENERATED_PASSWORD);

  assert.deepEqual(await inspectN5EventCreatorLocalProfile(root), {
    profilePath: path.join(root, N5_LOCAL_PROFILE_NAME),
    mode: 0o600,
    keyCount: 1,
    localhostTarget: true,
    finalNewline: true
  });
  assert.deepEqual(
    await quarantineN5EventCreatorLocalProfile(root, quarantineDirectory),
    {
      quarantineDirectory,
      mode: 0o600,
      profileMovedCount: 1
    }
  );
  await assert.rejects(lstat(path.join(root, N5_LOCAL_PROFILE_NAME)), /ENOENT/);
  const quarantined = await lstat(
    path.join(quarantineDirectory, N5_LOCAL_PROFILE_NAME)
  );
  assert.equal(quarantined.isFile(), true);
  assert.equal(quarantined.isSymbolicLink(), false);
  assert.equal(quarantined.mode & 0o777, 0o600);
  await assert.rejects(
    quarantineN5EventCreatorLocalProfile(root, quarantineDirectory),
    /N5 local Event creator credential provisioning failed\./
  );
});

test("rejects extra keys, a CA key, wrong target, and loose mode", async () => {
  for (const [contents, mode] of [
    [`${N5_DATABASE_URL_KEY}=${LOCAL_URL}\nEXTRA=value\n`, 0o600],
    [
      `${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n` +
        `${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n`,
      0o600
    ],
    [`${N5_DATABASE_URL_KEY}=\n`, 0o600],
    [`${N5_DATABASE_URL_KEY}=${LOCAL_URL}`, 0o600],
    [`${N5_DATABASE_URL_KEY}=${LOCAL_URL}\r\n`, 0o600],
    [
      `${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n${N5_DATABASE_CA_KEY}=value\n`,
      0o600
    ],
    [
      `${N5_DATABASE_URL_KEY}=postgresql://kimenosuke_event_creator:pw@localhost:54322/postgres\n`,
      0o600
    ],
    [
      `${N5_DATABASE_URL_KEY}=" ${LOCAL_URL} "\n`,
      0o600
    ],
    [
      `${N5_DATABASE_URL_KEY}=postgresql://bad%ZZ:pw@127.0.0.1:54322/postgres\n`,
      0o600
    ],
    [`${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n`, 0o644]
  ]) {
    const root = await temporaryRoot();
    const profilePath = path.join(root, N5_LOCAL_PROFILE_NAME);
    await writeFile(profilePath, contents, { mode });
    await chmod(profilePath, mode);
    await assert.rejects(
      loadN5EventCreatorLocalProfile(root),
      /N5 local Event creator profile is invalid\./
    );
  }
});

test("rejects a symlink without exposing its target", async () => {
  const root = await temporaryRoot();
  const target = path.join(root, "credential-source");
  await writeFile(target, `${N5_DATABASE_URL_KEY}=${LOCAL_URL}\n`, {
    mode: 0o600
  });
  await symlink(target, path.join(root, N5_LOCAL_PROFILE_NAME));
  await assert.rejects(
    loadN5EventCreatorLocalProfile(root),
    /N5 local Event creator profile is invalid\./
  );
});

test("removes inherited N5 variables and injects only a validated URL", () => {
  const parent = {
    KEEP: "value",
    [N5_DATABASE_URL_KEY]: "DO_NOT_INHERIT_URL",
    [N5_DATABASE_CA_KEY]: "DO_NOT_INHERIT_CA"
  };
  assert.deepEqual(sanitizedN5EventCreatorEnvironment(parent), {
    KEEP: "value"
  });
  assert.deepEqual(
    sanitizedN5EventCreatorEnvironment(parent, {
      [N5_DATABASE_URL_KEY]: LOCAL_URL
    }),
    {
      KEEP: "value",
      [N5_DATABASE_URL_KEY]: LOCAL_URL
    }
  );
});
