import { expect, test } from "@playwright/test";

import {
  EVENT_CREATOR_TIMEOUTS,
  EVENT_INSERT_SQL,
  executeEventInsert,
  resolveEventCreatorDatabase,
  resolveEventCreation,
  type EventCreatorClient
} from "../src/lib/event-creator-db-contract";

const CA_PEM =
  "-----BEGIN CERTIFICATE-----\nTEST-ONLY-CA\n-----END CERTIFICATE-----";

function databaseUrl(user: string, host: string, port: number) {
  return `postgresql://${encodeURIComponent(user)}:test-password@${host}:${port}/postgres`;
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

    await expect(
      executeEventInsert(known, {
        title: "title",
        memo: null,
        shareToken: "token"
      })
    ).resolves.toEqual({ status: "failed" });
    await expect(
      executeEventInsert(ambiguous, {
        title: "title",
        memo: null,
        shareToken: "token"
      })
    ).resolves.toEqual({ status: "outcome_unknown" });
    await expect(
      executeEventInsert(sqlStateConnectionFailure, {
        title: "title",
        memo: null,
        shareToken: "token"
      })
    ).resolves.toEqual({ status: "outcome_unknown" });
    await expect(
      executeEventInsert(connectFailure, {
        title: "title",
        memo: null,
        shareToken: "token"
      })
    ).resolves.toEqual({ status: "failed" });
    expect(endCount).toBe(4);
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
