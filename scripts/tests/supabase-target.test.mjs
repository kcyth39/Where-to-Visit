import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  loadSupabaseTarget,
  readSupabaseTargetProfile,
  sanitizedChildEnvironment
} from "../lib/supabase-target.mjs";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("QA target contract is distinct from Production and cleanup is task-correlated", async () => {
  const contract = JSON.parse(await readFile(
    path.join(repoRoot, "config", "supabase-targets.json"),
    "utf8"
  ));
  assert.deepEqual(
    {
      environment: contract.qa.environment,
      project: contract.qa.project,
      ref: contract.qa.ref,
      hostname: contract.qa.hostname,
      fixtureCleanup: contract.qa.fixtureCleanup
    },
    {
      environment: "qa",
      project: "where-to-visit-qa",
      ref: "twcbycyyrxbovtgiqaun",
      hostname: "twcbycyyrxbovtgiqaun.supabase.co",
      fixtureCleanup: "TASK_CORRELATED_ONLY"
    }
  );
  assert.equal(contract.remote.project, "where-to-visit-dev");
  assert.notEqual(contract.qa.ref, contract.remote.ref);
  assert.notEqual(contract.qa.project, contract.remote.project);
});

test("QA loader requires its own exact env and never falls back to Production", async () => {
  const temporary = await mkdtemp("/private/tmp/supabase-qa-target-test-");
  try {
    await mkdir(path.join(temporary, "config"), { recursive: true });
    await writeFile(
      path.join(temporary, "config", "supabase-targets.json"),
      await readFile(path.join(repoRoot, "config", "supabase-targets.json"), "utf8")
    );
    await assert.rejects(loadSupabaseTarget(temporary, "qa"));

    const envPath = path.join(temporary, ".env.supabase.qa");
    await writeFile(
      envPath,
      "SUPABASE_URL=https://twcbycyyrxbovtgiqaun.supabase.co\n" +
      "SUPABASE_ANON_KEY=dummy-qa-client-key\n",
      { mode: 0o600 }
    );
    await chmod(envPath, 0o600);
    const profile = await loadSupabaseTarget(temporary, "qa");
    assert.deepEqual(profile, {
      SUPABASE_URL: "https://twcbycyyrxbovtgiqaun.supabase.co",
      SUPABASE_ANON_KEY: "dummy-qa-client-key"
    });
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("target profile reader rejects replacement after opening the file", async () => {
  const temporary = await mkdtemp("/private/tmp/supabase-target-toctou-test-");
  try {
    const envPath = path.join(temporary, ".env.supabase.qa");
    const replacementPath = path.join(temporary, ".env.supabase.qa.replacement");
    const original =
      "SUPABASE_URL=https://twcbycyyrxbovtgiqaun.supabase.co\n" +
      "SUPABASE_ANON_KEY=dummy-qa-client-key\n";
    await writeFile(envPath, original, { mode: 0o600 });
    await writeFile(replacementPath, original, { mode: 0o600 });
    await assert.rejects(
      readSupabaseTargetProfile(envPath, {
        afterOpenForTest: () => rename(replacementPath, envPath)
      }),
      /changed during validation/
    );
  } finally {
    await rm(temporary, { recursive: true });
  }
});

test("target child injection removes ambient creator values and injects only the selected profile", () => {
  const previous = {
    url: process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL,
    ca: process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM,
    target: process.env.KIMENOSUKE_SUPABASE_TARGET
  };
  process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL = "ambient-url";
  process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM = "ambient-ca";
  process.env.KIMENOSUKE_SUPABASE_TARGET = "qa";
  try {
    const environment = sanitizedChildEnvironment(
      {
        SUPABASE_URL: "https://twcbycyyrxbovtgiqaun.supabase.co",
        SUPABASE_ANON_KEY: "dummy"
      },
      "qa",
      {
        KIMENOSUKE_EVENT_CREATOR_DATABASE_URL: "selected-url",
        KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM: "selected-ca"
      }
    );
    assert.equal(environment.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL, "selected-url");
    assert.equal(environment.KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM, "selected-ca");
    assert.equal(environment.KIMENOSUKE_SUPABASE_TARGET, "qa");
  } finally {
    if (previous.url === undefined) delete process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL;
    else process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL = previous.url;
    if (previous.ca === undefined) delete process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM;
    else process.env.KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM = previous.ca;
    if (previous.target === undefined) delete process.env.KIMENOSUKE_SUPABASE_TARGET;
    else process.env.KIMENOSUKE_SUPABASE_TARGET = previous.target;
  }
});

test("remote child injection omits target selectors and rejects creator profiles", () => {
  const previous = process.env.KIMENOSUKE_SUPABASE_TARGET;
  process.env.KIMENOSUKE_SUPABASE_TARGET = "qa";
  try {
    const environment = sanitizedChildEnvironment(
      {
        SUPABASE_URL: "https://ehmivhmsnhcrynvuahaq.supabase.co",
        SUPABASE_ANON_KEY: "dummy"
      },
      "remote"
    );
    assert.equal(environment.KIMENOSUKE_SUPABASE_TARGET, undefined);
    assert.equal(environment.KIMENOSUKE_EVENT_CREATOR_DATABASE_URL, undefined);
    assert.throws(
      () => sanitizedChildEnvironment(
        {
          SUPABASE_URL: "https://ehmivhmsnhcrynvuahaq.supabase.co",
          SUPABASE_ANON_KEY: "dummy"
        },
        "remote",
        {
          KIMENOSUKE_EVENT_CREATOR_DATABASE_URL: "selected-url",
          KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM: "selected-ca"
        }
      ),
      /cannot receive an Event creator profile/
    );
  } finally {
    if (previous === undefined) delete process.env.KIMENOSUKE_SUPABASE_TARGET;
    else process.env.KIMENOSUKE_SUPABASE_TARGET = previous;
  }
});
