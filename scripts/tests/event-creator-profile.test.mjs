import assert from "node:assert/strict";
import {
  chmod,
  chown,
  mkdtemp,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EVENT_CREATOR_DATABASE_CA_PEM,
  EVENT_CREATOR_DATABASE_URL,
  loadEventCreatorProfileForTarget,
  loadN9EventCreatorLocalProfile,
  loadQaEventCreatorProfile,
  N9_LOCAL_EVENT_CREATOR_PROFILE,
  QA_EVENT_CREATOR_PROFILE,
  sanitizedEventCreatorEnvironment
} from "../lib/event-creator-profile.mjs";

const LOCAL_URL =
  "postgresql://kimenosuke_event_creator:test-password@127.0.0.1:55322/postgres";
const QA_URL =
  "postgresql://kimenosuke_event_creator.twcbycyyrxbovtgiqaun:test-password@" +
  "aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
const QA_CA =
  "-----BEGIN CERTIFICATE-----\nTEST-ONLY-CA\n-----END CERTIFICATE-----";

async function tempRoot() {
  return mkdtemp(path.join(os.tmpdir(), "event-creator-profile-"));
}

async function writeProfile(root, name, contents) {
  const file = path.join(root, name);
  await writeFile(file, contents, { mode: 0o600 });
  await chmod(file, 0o600);
  await chown(file, process.getuid(), process.getgid());
  return file;
}

test("N9 local profile accepts only 55322, creator role, and empty CA", async () => {
  const root = await tempRoot();
  try {
    await writeProfile(
      root,
      N9_LOCAL_EVENT_CREATOR_PROFILE,
      `${EVENT_CREATOR_DATABASE_URL}=${LOCAL_URL}\n` +
      `${EVENT_CREATOR_DATABASE_CA_PEM}=\n`
    );
    const profile = await loadN9EventCreatorLocalProfile(root);
    assert.equal(profile[EVENT_CREATOR_DATABASE_URL], LOCAL_URL);
    assert.equal(profile[EVENT_CREATOR_DATABASE_CA_PEM], "");
    await assert.rejects(
      loadN9EventCreatorLocalProfile(await tempRoot()),
      /N9 local Event creator profile is invalid/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("QA profile binds to QA pooler identity and CA without exposing values", async () => {
  const root = await tempRoot();
  try {
    await writeProfile(
      root,
      QA_EVENT_CREATOR_PROFILE,
      `${EVENT_CREATOR_DATABASE_URL}=${QA_URL}\n` +
      `${EVENT_CREATOR_DATABASE_CA_PEM}="-----BEGIN CERTIFICATE-----\\nTEST-ONLY-CA\\n-----END CERTIFICATE-----"\n`
    );
    const profile = await loadQaEventCreatorProfile(root);
    assert.equal(profile[EVENT_CREATOR_DATABASE_URL], QA_URL);
    assert.equal(profile[EVENT_CREATOR_DATABASE_CA_PEM], QA_CA);

    const wrongRoot = await tempRoot();
    await writeProfile(
      wrongRoot,
      QA_EVENT_CREATOR_PROFILE,
      `${EVENT_CREATOR_DATABASE_URL}=${QA_URL.replace("twcbycyyrxbovtgiqaun", "ehmivhmsnhcrynvuahaq")}\n` +
      `${EVENT_CREATOR_DATABASE_CA_PEM}="-----BEGIN CERTIFICATE-----\\nTEST-ONLY-CA\\n-----END CERTIFICATE-----"\n`
    );
    await assert.rejects(loadQaEventCreatorProfile(wrongRoot), /QA Event creator profile is invalid/);
    await rm(wrongRoot, { recursive: true, force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("creator profile loader rejects symlinks and sanitizer removes ambient values", async () => {
  const root = await tempRoot();
  try {
    const source = await writeProfile(
      root,
      "source.env",
      `${EVENT_CREATOR_DATABASE_URL}=${LOCAL_URL}\n${EVENT_CREATOR_DATABASE_CA_PEM}=\n`
    );
    await symlink(source, path.join(root, N9_LOCAL_EVENT_CREATOR_PROFILE));
    await assert.rejects(
      loadN9EventCreatorLocalProfile(root),
      /N9 local Event creator profile is invalid/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const selected = {
    [EVENT_CREATOR_DATABASE_URL]: LOCAL_URL,
    [EVENT_CREATOR_DATABASE_CA_PEM]: ""
  };
  assert.deepEqual(
    sanitizedEventCreatorEnvironment(
      {
        KEEP: "value",
        [EVENT_CREATOR_DATABASE_URL]: "ambient",
        [EVENT_CREATOR_DATABASE_CA_PEM]: "ambient-ca"
      },
      selected
    ),
    { KEEP: "value", ...selected }
  );
});

test("N9 and QA loaders reject loose mode and replacement after open", async () => {
  const root = await tempRoot();
  try {
    const n9Path = await writeProfile(
      root,
      N9_LOCAL_EVENT_CREATOR_PROFILE,
      `${EVENT_CREATOR_DATABASE_URL}=${LOCAL_URL}\n` +
      `${EVENT_CREATOR_DATABASE_CA_PEM}=\n`
    );
    await chmod(n9Path, 0o644);
    await assert.rejects(
      loadN9EventCreatorLocalProfile(root),
      /N9 local Event creator profile is invalid/
    );
    await chmod(n9Path, 0o600);
    const qaContents =
      `${EVENT_CREATOR_DATABASE_URL}=${QA_URL}\n` +
      `${EVENT_CREATOR_DATABASE_CA_PEM}="-----BEGIN CERTIFICATE-----\\nTEST-ONLY-CA\\n-----END CERTIFICATE-----"\n`;
    await writeProfile(root, QA_EVENT_CREATOR_PROFILE, qaContents);
    const replacementPath = path.join(root, "qa-replacement.env");
    await writeProfile(root, "qa-replacement.env", qaContents);
    await assert.rejects(
      loadQaEventCreatorProfile(root, {
        afterOpenForTest: () => rename(
          replacementPath,
          path.join(root, QA_EVENT_CREATOR_PROFILE)
        )
      }),
      /QA Event creator profile is invalid/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("target loader preserves N6 profile mapping and rejects remote creator injection", async () => {
  const root = await tempRoot();
  try {
    await writeProfile(
      root,
      ".env.n5-event-creator.local",
      "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL=" +
      "postgresql://kimenosuke_event_creator:test-password@127.0.0.1:54322/postgres\n"
    );
    const profile = await loadEventCreatorProfileForTarget(root, "local");
    assert.equal(profile.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL.includes(":54322/"), true);
    assert.equal(await loadEventCreatorProfileForTarget(root, "remote"), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
