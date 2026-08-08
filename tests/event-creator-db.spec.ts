import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  EVENT_CREATOR_TIMEOUTS,
  EVENT_INSERT_SQL,
  emitEventCreatorDiagnostic,
  executeEventInsert,
  resolveEventCreatorDatabase,
  resolveEventCreation,
  safeEmitEventCreatorDiagnostic,
  type EventCreatorClient,
  type EventCreatorDiagnostic
} from "../src/lib/event-creator-db-contract";

const CA_PEM =
  "-----BEGIN CERTIFICATE-----\nTEST-ONLY-CA\n-----END CERTIFICATE-----";

function databaseUrl(user: string, host: string, port: number) {
  return `postgresql://${encodeURIComponent(user)}:test-password@${host}:${port}/postgres`;
}

function diagnosticCapture() {
  const records: EventCreatorDiagnostic[] = [];
  return { records, sink: (record: EventCreatorDiagnostic) => records.push(record) };
}

function eventValues() {
  return {
    title: "secret-title-N9-S4",
    memo: "secret-memo-N9-S4",
    shareToken: "secret-share-token-N9-S4"
  };
}

test.describe("N5 event creator database contract", () => {
  test("accepts only the exact local target without a CA", () => {
    const ready = resolveEventCreatorDatabase({
      databaseUrl: databaseUrl(
        "kimenosuke_event_creator",
        "127.0.0.1",
        54322
      ),
      nodeEnv: "test"
    });
    expect(ready.status).toBe("ready");
    if (ready.status !== "ready") return;
    expect(ready.clientConfig).toMatchObject({
      ssl: false,
      connectionTimeoutMillis:
        EVENT_CREATOR_TIMEOUTS.connectionTimeoutMillis,
      lock_timeout: EVENT_CREATOR_TIMEOUTS.lockTimeoutMillis,
      statement_timeout: EVENT_CREATOR_TIMEOUTS.statementTimeoutMillis,
      query_timeout: EVENT_CREATOR_TIMEOUTS.queryTimeoutMillis,
      idle_in_transaction_session_timeout:
        EVENT_CREATOR_TIMEOUTS.idleTransactionTimeoutMillis,
      application_name: "kimenosuke-event-creator",
      client_encoding: "UTF8"
    });

    for (const inputs of [
      {
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator",
          "localhost",
          54322
        ),
        nodeEnv: "test"
      },
      {
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator",
          "127.0.0.1",
          54321
        ),
        nodeEnv: "test"
      },
      {
        databaseUrl: databaseUrl("postgres", "127.0.0.1", 54322),
        nodeEnv: "test"
      },
      {
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator",
          "127.0.0.1",
          54322
        ),
        databaseCaPem: "",
        nodeEnv: "test"
      }
    ]) {
      expect(resolveEventCreatorDatabase(inputs)).toEqual({
        status: "unavailable"
      });
    }
  });

  test("explicit local target rejects hosted environment crossover", () => {
    const localInputs = {
      databaseUrl: databaseUrl(
        "kimenosuke_event_creator",
        "127.0.0.1",
        54322
      ),
      nodeEnv: "test" as const,
      supabaseTarget: "local" as const
    };
    expect(resolveEventCreatorDatabase(localInputs).status).toBe("ready");

    expect(
      resolveEventCreatorDatabase({
        ...localInputs,
        vercelEnv: "preview",
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: CA_PEM
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        ...localInputs,
        vercelEnv: "production",
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.ehmivhmsnhcrynvuahaq",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: CA_PEM
      })
    ).toEqual({ status: "unavailable" });
  });

  test("binds Preview and Production to separate Supabase project refs", () => {
    const preview = resolveEventCreatorDatabase({
      databaseUrl: databaseUrl(
        "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
        "aws-0-ap-northeast-1.pooler.supabase.com",
        6543
      ),
      databaseCaPem: CA_PEM,
      nodeEnv: "production",
      vercelEnv: "preview"
    });
    expect(preview.status).toBe("ready");
    if (preview.status === "ready") {
      expect(preview.clientConfig.ssl).toEqual({
        ca: CA_PEM,
        rejectUnauthorized: true
      });
    }

    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: CA_PEM,
        nodeEnv: "production",
        vercelEnv: "production"
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.ehmivhmsnhcrynvuahaq",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: CA_PEM,
        nodeEnv: "production",
        vercelEnv: "production"
      }).status
    ).toBe("ready");

    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.ehmivhmsnhcrynvuahaq",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: CA_PEM,
        nodeEnv: "production",
        supabaseTarget: "remote"
      })
    ).toEqual({ status: "unavailable" });
  });

  test("accepts N9 Local only through the explicit target selector", () => {
    const ready = resolveEventCreatorDatabase({
      databaseUrl: databaseUrl(
        "kimenosuke_event_creator",
        "127.0.0.1",
        55322
      ),
      databaseCaPem: "",
      nodeEnv: "test",
      supabaseTarget: "n9-stage1"
    });
    expect(ready.status).toBe("ready");
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator",
          "127.0.0.1",
          55322
        ),
        databaseCaPem: "",
        nodeEnv: "test"
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator",
          "127.0.0.1",
          55322
        ),
        databaseCaPem: "",
        nodeEnv: "production",
        supabaseTarget: "n9-stage1"
      })
    ).toEqual({ status: "unavailable" });
  });

  test("accepts QA creator only through the explicit QA target selector", () => {
    const url = databaseUrl(
      "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
      "aws-0-ap-northeast-1.pooler.supabase.com",
      6543
    );
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: url,
        databaseCaPem: CA_PEM,
        nodeEnv: "test",
        supabaseTarget: "qa"
      }).status
    ).toBe("ready");
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: url,
        databaseCaPem: CA_PEM,
        nodeEnv: "test",
        supabaseTarget: "n9-stage1"
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: url,
        databaseCaPem: CA_PEM,
        nodeEnv: "test"
      })
    ).toEqual({ status: "unavailable" });
  });

  test("normalizes only outer whitespace around hosted CA PEM input", () => {
    const previewDatabaseUrl = databaseUrl(
      "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
      "aws-0-ap-northeast-1.pooler.supabase.com",
      6543
    );

    for (const databaseCaPem of [
      CA_PEM,
      `${CA_PEM}\n`,
      `${CA_PEM}\r\n`,
      ` \t${CA_PEM}\r\n `
    ]) {
      const resolution = resolveEventCreatorDatabase({
        databaseUrl: previewDatabaseUrl,
        databaseCaPem,
        nodeEnv: "production",
        vercelEnv: "preview"
      });
      expect(resolution.status).toBe("ready");
      if (resolution.status === "ready") {
        expect(resolution.clientConfig.ssl).toEqual({
          ca: CA_PEM,
          rejectUnauthorized: true
        });
      }
    }
  });

  test("rejects missing, malformed, and URL-embedded SSL configuration", () => {
    expect(resolveEventCreatorDatabase({ nodeEnv: "test" })).toEqual({
      status: "unavailable"
    });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl:
          "postgresql://kimenosuke_event_creator:pw@127.0.0.1:54322/postgres?sslmode=disable",
        nodeEnv: "test"
      })
    ).toEqual({ status: "unavailable" });
    for (const databaseCaPem of [
      " \t\r\n ",
      "-----BEGIN CERTIFICATE-----\nTEST-ONLY-CA",
      "TEST-ONLY-CA\n-----END CERTIFICATE-----",
      "-----BEGIN CERTIFICATE-----\n\n-----END CERTIFICATE-----",
      `${CA_PEM}\0`,
      `${CA_PEM}\nnot-a-certificate`
    ]) {
      expect(
        resolveEventCreatorDatabase({
          databaseUrl: databaseUrl(
            "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
            "aws-0-ap-northeast-1.pooler.supabase.com",
            6543
          ),
          databaseCaPem,
          nodeEnv: "production",
          vercelEnv: "preview"
        })
      ).toEqual({ status: "unavailable" });
    }
    expect(
      resolveEventCreatorDatabase({
        databaseUrl: databaseUrl(
          "kimenosuke_event_creator.twcbycyyrxbovtgiqaun",
          "aws-0-ap-northeast-1.pooler.supabase.com",
          6543
        ),
        databaseCaPem: "",
        nodeEnv: "production",
        vercelEnv: "preview"
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl:
          "postgresql://bad%ZZ:pw@127.0.0.1:54322/postgres",
        nodeEnv: "test"
      })
    ).toEqual({ status: "unavailable" });
    expect(
      resolveEventCreatorDatabase({
        databaseUrl:
          "postgresql://bad%ZZ:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
        databaseCaPem: CA_PEM,
        nodeEnv: "production",
        vercelEnv: "preview"
      })
    ).toEqual({ status: "unavailable" });
  });

  test("classifies resolver-unavailable configuration without exposing env values", () => {
    const capture = diagnosticCapture();
    expect(
      resolveEventCreatorDatabase({
        nodeEnv: "production",
        vercelEnv: "production"
      })
    ).toEqual({ status: "unavailable" });
    safeEmitEventCreatorDiagnostic(capture.sink, {
      event: "event_creator_failure",
      version: 1,
      phase: "config",
      category: "creator_config_invalid"
    });
    expect(capture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "config",
        category: "creator_config_invalid"
      }
    ]);
    const databaseSource = readFileSync("src/lib/event-creator-db.ts", "utf8");
    expect(databaseSource).toContain('phase: "config"');
    expect(databaseSource).toContain('category: "creator_config_invalid"');
  });

  test("classifies connect boundaries without changing failed response outcomes", async () => {
    const cases = [
      ["28P01", "creator_auth_failed"],
      ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "creator_tls_failed"],
      ["ECONNREFUSED", "creator_connect_failed"]
    ] as const;

    for (const [code, category] of cases) {
      const capture = diagnosticCapture();
      const client: EventCreatorClient = {
        async connect() {
          throw Object.assign(new Error("secret-error-message"), { code });
        },
        async query() {
          throw new Error("must not run");
        },
        async end() {}
      };
      await expect(executeEventInsert(client, eventValues(), capture.sink)).resolves.toEqual({
        status: "failed"
      });
      expect(capture.records).toEqual([
        {
          event: "event_creator_failure",
          version: 1,
          phase: "connect",
          category,
          ...(code === "28P01" ? { sqlstate: "28P01" } : {})
        }
      ]);
      expect(JSON.stringify(capture.records)).not.toContain("secret-");
    }
  });

  test("uses one unnamed parameterized query and always ends the client", async () => {
    const calls: unknown[] = [];
    const client: EventCreatorClient = {
      async connect() {
        calls.push("connect");
      },
      async query(config) {
        calls.push(config);
        return { rowCount: 1 };
      },
      async end() {
        calls.push("end");
      }
    };
    await expect(
      executeEventInsert(client, {
        title: "title",
        memo: "memo",
        shareToken: "share-token"
      })
    ).resolves.toEqual({ status: "created" });
    expect(calls).toEqual([
      "connect",
      {
        text: EVENT_INSERT_SQL,
        values: ["title", "memo", "share-token"]
      },
      "end"
    ]);
    expect(calls[1]).not.toHaveProperty("name");
  });

  test("separates known failure from an ambiguous post-dispatch failure", async () => {
    let endCount = 0;
    const known: EventCreatorClient = {
      async connect() {},
      async query() {
        throw Object.assign(new Error("constraint"), { code: "23514" });
      },
      async end() {
        endCount += 1;
      }
    };
    const ambiguous: EventCreatorClient = {
      async connect() {},
      async query() {
        throw Object.assign(new Error("socket"), { code: "ECONNRESET" });
      },
      async end() {
        endCount += 1;
      }
    };
    const sqlStateConnectionFailure: EventCreatorClient = {
      async connect() {},
      async query() {
        throw Object.assign(new Error("connection failure"), { code: "08006" });
      },
      async end() {
        endCount += 1;
      }
    };
    const connectFailure: EventCreatorClient = {
      async connect() {
        throw new Error("connect");
      },
      async query() {
        throw new Error("must not run");
      },
      async end() {
        endCount += 1;
      }
    };

    const knownCapture = diagnosticCapture();
    const ambiguousCapture = diagnosticCapture();
    const sqlStateCapture = diagnosticCapture();
    const connectCapture = diagnosticCapture();
    await expect(
      executeEventInsert(known, eventValues(), knownCapture.sink)
    ).resolves.toEqual({ status: "failed" });
    await expect(
      executeEventInsert(ambiguous, eventValues(), ambiguousCapture.sink)
    ).resolves.toEqual({ status: "outcome_unknown" });
    await expect(
      executeEventInsert(
        sqlStateConnectionFailure,
        eventValues(),
        sqlStateCapture.sink
      )
    ).resolves.toEqual({ status: "outcome_unknown" });
    expect(knownCapture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "query",
        category: "creator_sql_failed",
        sqlstate: "23514"
      }
    ]);
    expect(ambiguousCapture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "query",
        category: "creator_outcome_unknown"
      }
    ]);
    expect(sqlStateCapture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "query",
        category: "creator_outcome_unknown",
        sqlstate: "08006"
      }
    ]);
    await expect(
      executeEventInsert(connectFailure, eventValues(), connectCapture.sink)
    ).resolves.toEqual({ status: "failed" });
    expect(connectCapture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "connect",
        category: "creator_connect_failed"
      }
    ]);
    expect(endCount).toBe(4);
  });

  test("classifies row-count mismatches and never logs a successful insert", async () => {
    for (const rowCount of [0, 2]) {
      const capture = diagnosticCapture();
      const client: EventCreatorClient = {
        async connect() {},
        async query() {
          return { rowCount };
        },
        async end() {}
      };
      await expect(executeEventInsert(client, eventValues(), capture.sink)).resolves.toEqual({
        status: "failed"
      });
      expect(capture.records).toEqual([
        {
          event: "event_creator_failure",
          version: 1,
          phase: "query",
          category: "creator_result_invalid"
        }
      ]);
    }

    const successCapture = diagnosticCapture();
    const successClient: EventCreatorClient = {
      async connect() {},
      async query() {
        return { rowCount: 1 };
      },
      async end() {}
    };
    await expect(
      executeEventInsert(successClient, eventValues(), successCapture.sink)
    ).resolves.toEqual({ status: "created" });
    expect(successCapture.records).toEqual([]);
  });

  test("classifies exact request-shape failure while preserving route result semantics", async () => {
    const capture = diagnosticCapture();
    let dispatchCount = 0;
    await expect(
      resolveEventCreation(
        { title: 42, memo: "secret-memo-N9-S4" },
        async () => {
          dispatchCount += 1;
          return { status: "created" };
        },
        () => "secret-share-token-N9-S4",
        capture.sink
      )
    ).resolves.toEqual({ status: "failed" });
    expect(dispatchCount).toBe(0);
    expect(capture.records).toEqual([
      {
        event: "event_creator_failure",
        version: 1,
        phase: "request",
        category: "creator_request_invalid"
      }
    ]);
  });

  test("swallows diagnostic sink failures and keeps Data API fallback absent", async () => {
    const client: EventCreatorClient = {
      async connect() {
        throw Object.assign(new Error("secret-error-message"), {
          code: "ECONNREFUSED"
        });
      },
      async query() {
        throw new Error("must not run");
      },
      async end() {}
    };
    await expect(
      executeEventInsert(client, eventValues(), () => {
        throw new Error("sink failure");
      })
    ).resolves.toEqual({ status: "failed" });

    const serializedSource = readFileSync("src/lib/event-creator-db.ts", "utf8");
    const routeSource = readFileSync("src/app/api/events/route.ts", "utf8");
    expect(serializedSource).toContain('from "pg"');
    expect(serializedSource).not.toContain("@supabase/supabase-js");
    expect(serializedSource).not.toContain("fetch(");
    expect(routeSource).toContain(
      'if (result.status === "created") return response(result, 201);'
    );
    expect(routeSource).toContain(
      'if (result.status === "invalid") return response(result, 400);'
    );
    expect(routeSource).toContain("return response(result, 503);");
  });

  test("default logger emits only the fixed schema without raw errors or secrets", () => {
    const lines: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      lines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      emitEventCreatorDiagnostic({
        event: "event_creator_failure",
        version: 1,
        phase: "query",
        category: "creator_sql_failed",
        sqlstate: "23514"
      });
    } finally {
      console.warn = originalWarn;
    }
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      event: "event_creator_failure",
      version: 1,
      phase: "query",
      category: "creator_sql_failed",
      sqlstate: "23514"
    });
    expect(lines[0]).not.toContain("secret-");
    expect(lines[0]).not.toContain("error-message");
  });

  test("rejects an unpaired memo surrogate before token generation or dispatch", async () => {
    let dispatchCount = 0;
    let tokenCount = 0;
    await expect(
      resolveEventCreation(
        { title: "title", memo: "\ud800" },
        async () => {
          dispatchCount += 1;
          return { status: "created" };
        },
        () => {
          tokenCount += 1;
          return "token";
        }
      )
    ).resolves.toEqual({ status: "invalid", field: "memo" });
    expect(dispatchCount).toBe(0);
    expect(tokenCount).toBe(0);
  });

  test("normalizes and binds validated route input once", async () => {
    const dispatched: unknown[] = [];
    await expect(
      resolveEventCreation(
        { title: "  title  ", memo: " memo\r\nline " },
        async (values) => {
          dispatched.push(values);
          return { status: "created" };
        },
        () => "test-share-token"
      )
    ).resolves.toEqual({
      status: "created",
      path: "/e/test-share-token?created=1"
    });
    expect(dispatched).toEqual([
      {
        title: "title",
        memo: "memo\nline",
        shareToken: "test-share-token"
      }
    ]);
  });
});
