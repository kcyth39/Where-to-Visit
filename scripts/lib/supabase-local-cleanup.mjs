import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const SHA_PATTERN = /^[0-9a-f]{64}$/;
const MAX_BYTES = 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

export function parseCleanupArgs(argv) {
  const values = new Map();
  const allowed = new Set(["--mode", "--file", "--sha256"]);
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(name)) fail(`Unknown argument: ${name ?? "<missing>"}`);
    if (values.has(name)) fail(`Duplicate argument: ${name}`);
    if (value === undefined || value.startsWith("--")) fail(`Missing value for ${name}`);
    values.set(name, value);
  }
  if (values.size !== 3) fail("Exactly --mode, --file, and --sha256 are required.");
  const mode = values.get("--mode");
  const file = values.get("--file");
  const sha256 = values.get("--sha256");
  if (mode !== "rollback" && mode !== "commit") fail("--mode must be rollback or commit.");
  if (!path.isAbsolute(file)) fail("--file must be an absolute path.");
  if (!SHA_PATTERN.test(sha256)) fail("--sha256 must be 64 lowercase hexadecimal characters.");
  return { mode, file, sha256 };
}

function splitTopLevelStatements(sql) {
  const statements = [];
  let executable = "";
  let state = "normal";
  let blockDepth = 0;
  let dollarTag = "";

  const finishStatement = () => {
    const normalized = executable.replace(/\s+/g, " ").trim();
    if (normalized) statements.push(normalized);
    executable = "";
  };

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === "line-comment") {
      if (char === "\n" || char === "\r") {
        state = "normal";
        executable += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (char === "/" && next === "*") {
        blockDepth += 1;
        index += 1;
      } else if (char === "*" && next === "/") {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) {
          state = "normal";
          executable += " ";
        }
      }
      continue;
    }
    if (state === "single-quote") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = "normal";
      continue;
    }
    if (state === "double-quote") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = "normal";
      continue;
    }
    if (state === "dollar-quote") {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = "normal";
      }
      continue;
    }

    if (char === "\\") {
      fail("psql meta-commands are forbidden.");
    } else if (char === "-" && next === "-") {
      state = "line-comment";
      index += 1;
    } else if (char === "/" && next === "*") {
      state = "block-comment";
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      state = "single-quote";
      executable += " ? ";
    } else if (char === '"') {
      state = "double-quote";
      executable += " ? ";
    } else if (char === "$") {
      const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        dollarTag = match[0];
        state = "dollar-quote";
        executable += " ? ";
        index += dollarTag.length - 1;
      } else {
        executable += char;
      }
    } else if (char === ";") {
      finishStatement();
    } else {
      executable += char;
    }
  }

  if (state !== "normal" && state !== "line-comment") {
    fail("SQL file contains an unterminated quote or block comment.");
  }
  finishStatement();
  return statements;
}

function isTransactionControl(statement) {
  const upper = statement.toUpperCase();
  return /^(?:BEGIN|COMMIT|END|ROLLBACK|ABORT)(?:\s|$)/.test(upper)
    || /^(?:START|PREPARE)\s+TRANSACTION(?:\s|$)/.test(upper);
}

export function validateCleanupSql(sql, mode) {
  if (sql.includes("\0")) fail("SQL file contains a NUL byte.");
  if (/\bCOPY\b[\s\S]*\bPROGRAM\b/i.test(sql)) fail("COPY PROGRAM is forbidden.");
  if (/\b(pg_read_file|pg_read_binary_file|pg_write_file|lo_import|lo_export)\s*\(/i.test(sql)) {
    fail("File access functions are forbidden.");
  }
  const statements = splitTopLevelStatements(sql);
  if (statements[0]?.toUpperCase() !== "BEGIN") fail("The first executable statement must be exactly BEGIN.");
  const expectedTerminal = mode === "rollback" ? "ROLLBACK" : "COMMIT";
  if (statements.at(-1)?.toUpperCase() !== expectedTerminal) {
    fail(`${mode === "rollback" ? "Rollback" : "Commit"} SQL must end with exactly one ${expectedTerminal}.`);
  }
  for (const statement of statements.slice(1, -1)) {
    if (isTransactionControl(statement)) fail("Intermediate transaction control is forbidden.");
  }
}

export async function loadReviewedCleanupFile(file, expectedSha256, mode) {
  const stat = await lstat(file).catch(() => fail("SQL file does not exist."));
  if (!stat.isFile() || stat.isSymbolicLink()) fail("SQL file must be a regular non-symlink file.");
  const resolved = await realpath(file);
  if (!resolved.startsWith("/private/tmp/")) fail("SQL file must resolve inside /private/tmp.");
  if ((stat.mode & 0o077) !== 0) fail("SQL file must not grant group or other permissions.");
  if (stat.size > MAX_BYTES) fail("SQL file exceeds the 1 MiB limit.");
  const contents = await readFile(file);
  const actualSha256 = createHash("sha256").update(contents).digest("hex");
  if (actualSha256 !== expectedSha256) {
    const error = new Error(`SQL SHA-256 mismatch: expected ${expectedSha256}, actual ${actualSha256}.`);
    error.expectedSha256 = expectedSha256;
    error.actualSha256 = actualSha256;
    throw error;
  }
  const sql = contents.toString("utf8");
  validateCleanupSql(sql, mode);
  return { sql, actualSha256, bytes: contents.length };
}

export function dockerExecPsqlArgs(containerId) {
  return [
    "exec", "-i", "--user", "postgres", containerId,
    "psql", "--no-psqlrc", "--set=ON_ERROR_STOP=1",
    "--set=VERBOSITY=verbose", "--pset=pager=off",
    "--username=postgres", "--dbname=postgres"
  ];
}
