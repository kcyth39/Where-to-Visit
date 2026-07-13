import assert from "node:assert/strict";
import { chmod, mkdtemp, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { runCommandAsync } from "../lib/command.mjs";
import { selectLocalDbContainer } from "../lib/supabase-local.mjs";
import {
  dockerExecPsqlArgs,
  loadReviewedCleanupFile,
  parseCleanupArgs,
  validateCleanupSql
} from "../lib/supabase-local-cleanup.mjs";
import { createHash } from "node:crypto";

const rollbackSql = "BEGIN;\nselect 1;\nROLLBACK;\n";
const commitSql = "BEGIN;\nselect 1;\nCOMMIT;\n";

test("parses exact rollback and commit arguments", () => {
  assert.equal(parseCleanupArgs(["--mode","rollback","--file","/tmp/a.sql","--sha256","a".repeat(64)]).mode,"rollback");
  assert.equal(parseCleanupArgs(["--mode","commit","--file","/tmp/a.sql","--sha256","b".repeat(64)]).mode,"commit");
});

for (const [name,args] of [
  ["unknown argument",["--wat","x"]],
  ["duplicate argument",["--mode","rollback","--mode","commit","--file","/tmp/a","--sha256","a".repeat(64)]],
  ["invalid mode",["--mode","other","--file","/tmp/a","--sha256","a".repeat(64)]],
  ["relative path",["--mode","rollback","--file","a.sql","--sha256","a".repeat(64)]],
  ["malformed sha",["--mode","rollback","--file","/tmp/a","--sha256","ABC"]]
]) test(`rejects ${name}`,()=>assert.throws(()=>parseCleanupArgs(args)));

test("validates mode termination and forbidden SQL", () => {
  validateCleanupSql(rollbackSql,"rollback");
  validateCleanupSql(commitSql,"commit");
  for (const [sql,mode] of [
    [commitSql,"rollback"],[rollbackSql,"commit"],["select 1;\nROLLBACK;","rollback"],
    ["BEGIN;\n\\! echo no\nROLLBACK;","rollback"],
    ["BEGIN;\nCOPY x TO PROGRAM 'x';\nROLLBACK;","rollback"],
    ["BEGIN;\nselect pg_read_file('x');\nROLLBACK;","rollback"],
    ["BEGIN;\nselect pg_read_binary_file('x');\nROLLBACK;","rollback"],
    ["BEGIN;\nselect pg_write_file('x','y');\nROLLBACK;","rollback"],
    ["BEGIN;\nselect lo_import('x');\nROLLBACK;","rollback"],
    ["BEGIN;\nselect lo_export(1,'x');\nROLLBACK;","rollback"],
    ["BEGIN;\nselect E'\\000';\nROLLBACK;\0","rollback"]
  ]) assert.throws(()=>validateCleanupSql(sql,mode));
});

test("rejects hidden and intermediate transaction control", () => {
  for (const sql of [
    "BEGIN; select 1; COMMIT; select 2; ROLLBACK;",
    "BEGIN; select 1; END; ROLLBACK;",
    "BEGIN; select 1; END WORK; ROLLBACK;",
    "BEGIN; select 1; COMMIT AND CHAIN; ROLLBACK;",
    "BEGIN; PREPARE TRANSACTION 'cleanup'; ROLLBACK;",
    "BEGIN; select 1; ROLLBACK; select 2; COMMIT;",
    "BEGIN; select 1; ROLLBACK; select 2;"
  ]) assert.throws(()=>validateCleanupSql(sql,"rollback"));
});

test("ignores transaction words in comments, strings, identifiers, and dollar bodies", () => {
  validateCleanupSql(`/* outer /* BEGIN; COMMIT; */ END; */
BEGIN;
-- COMMIT; ROLLBACK;
select 'BEGIN; END; COMMIT;', "ROLLBACK";
do $body$
begin
  perform 'COMMIT;';
end;
$body$;
ROLLBACK;`, "rollback");
});

test("rejects unquoted psql meta-command backslashes anywhere on a line", () => {
  const cases = [
    String.raw`BEGIN; select 1; \! echo unsafe; select 2; ROLLBACK;`,
    String.raw`BEGIN; select 1; \g; ROLLBACK;`,
    String.raw`BEGIN; select 1; \gexec; ROLLBACK;`,
    String.raw`BEGIN; select 1; \i unsafe.sql; ROLLBACK;`,
    String.raw`BEGIN; select 1; \ir unsafe.sql; ROLLBACK;`,
    String.raw`BEGIN; select 1; \connect other; ROLLBACK;`,
    String.raw`BEGIN; select 1; \c other; ROLLBACK;`,
    String.raw`BEGIN; select 1; \copy data to 'unsafe'; ROLLBACK;`,
    String.raw`BEGIN; select 1; \\ select 2; ROLLBACK;`,
    String.raw`BEGIN; select 1;\! echo unsafe;ROLLBACK;`
  ];
  for (const sql of cases) {
    assert.throws(
      () => validateCleanupSql(sql, "rollback"),
      (error) => error.message === "psql meta-commands are forbidden."
        && !error.message.includes("echo unsafe")
    );
  }
});

test("allows backslashes inside comments, quotes, identifiers, and dollar bodies", () => {
  validateCleanupSql(String.raw`/* outer \copy /* nested \gexec */ */
BEGIN;
-- \! echo ignored
select 'C:\\temp\\file', "quoted\\identifier";
do $body$
begin
  perform '\connect ignored';
end;
$body$;
ROLLBACK;`, "rollback");
});

test("validates reviewed runtime files", async (t) => {
  const root = await mkdtemp("/tmp/cleanup-wrapper-");
  const good = path.join(root,"good.sql");
  await writeFile(good,rollbackSql,{mode:0o600});
  const sha = createHash("sha256").update(rollbackSql).digest("hex");
  assert.equal((await loadReviewedCleanupFile(good,sha,"rollback")).actualSha256,sha);
  await assert.rejects(loadReviewedCleanupFile(path.join(root,"missing.sql"),sha,"rollback"));
  await assert.rejects(loadReviewedCleanupFile(good,"0".repeat(64),"rollback"));
  await chmod(good,0o640);
  await assert.rejects(loadReviewedCleanupFile(good,sha,"rollback"));
  await chmod(good,0o600);
  const link=path.join(root,"link.sql"); await symlink(good,link);
  await assert.rejects(loadReviewedCleanupFile(link,sha,"rollback"));
  const large=path.join(root,"large.sql"); await writeFile(large,Buffer.alloc(1024*1024+1),{mode:0o600});
  await assert.rejects(loadReviewedCleanupFile(large,"0".repeat(64),"rollback"));
  await t.test("rejects outside tmp",async()=>await assert.rejects(loadReviewedCleanupFile("/etc/hosts","0".repeat(64),"rollback")));
});

function dbContainer(overrides={}) { return {id:"db-id",name:"supabase_db_Where-to-Visit",service:"db",running:true,networks:["where-to-visit-supabase-local"],published:[],...overrides}; }
test("selects exactly one running DB container on the fixed network",()=>assert.equal(selectLocalDbContainer([dbContainer()]).id,"db-id"));
test("rejects zero, ambiguous, stopped, and wrong-network DB containers",()=>{
  assert.throws(()=>selectLocalDbContainer([]));
  assert.throws(()=>selectLocalDbContainer([dbContainer(),dbContainer({id:"two"})]));
  assert.throws(()=>selectLocalDbContainer([dbContainer({running:false})]));
  assert.throws(()=>selectLocalDbContainer([dbContainer({networks:["other"]})]));
});

test("constructs exact psql arguments without SQL",()=>{
  const args=dockerExecPsqlArgs("db-id");
  assert.deepEqual(args,["exec","-i","--user","postgres","db-id","psql","--no-psqlrc","--set=ON_ERROR_STOP=1","--set=VERBOSITY=verbose","--pset=pager=off","--username=postgres","--dbname=postgres"]);
  assert.equal(args.includes(rollbackSql),false);
});

test("runCommandAsync keeps no-input behavior and writes input once",async()=>{
  const noInput=await runCommandAsync(process.execPath,["-e","process.stdout.write('ok')"]);
  assert.equal(noInput.stdout,"ok");
  const withInput=await runCommandAsync(process.execPath,["-e","process.stdin.pipe(process.stdout)"],{input:"secret-sql"});
  assert.equal(withInput.stdout,"secret-sql");
});

test("runCommandAsync waits for inherited stdout to close",async()=>{
  const script = `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', "setTimeout(() => process.stdout.write('tail-marker'), 80)"], {
      detached: true,
      stdio: ['ignore', process.stdout, process.stderr]
    });
    child.unref();
    process.stdout.write('head-marker|');
  `;
  const result = await runCommandAsync(process.execPath,["-e",script]);
  assert.equal(result.stdout,"head-marker|tail-marker");
});

test("runCommandAsync preserves delayed stdout and stderr on failure",async()=>{
  const script = `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', "setTimeout(() => { process.stdout.write('stdout-tail'); process.stderr.write('stderr-tail'); }, 80)"], {
      detached: true,
      stdio: ['ignore', process.stdout, process.stderr]
    });
    child.unref();
    process.stdout.write('stdout-head|');
    process.stderr.write('stderr-head|');
    process.exit(7);
  `;
  await assert.rejects(
    runCommandAsync(process.execPath,["-e",script]),
    (error)=>error.status===7&&error.stdout==="stdout-head|stdout-tail"&&error.stderr==="stderr-head|stderr-tail"
  );
});

test("command errors do not contain stdin SQL",async()=>{
  await assert.rejects(
    runCommandAsync(process.execPath,["-e","process.stdin.resume();process.exit(2)"],{input:"DO NOT LEAK"}),
    (error)=>!error.message.includes("DO NOT LEAK")&&!error.stderr.includes("DO NOT LEAK")
  );
});
