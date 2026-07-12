import { expect, test } from "@playwright/test";

import {
  buildEventState,
  decisionStates,
  relativeCandidateTime
} from "../src/lib/event-state";

test.describe("collaborative read model", () => {
  test("classifies clear, discussion, fallback, ties, and all-zero candidates", () => {
    const mixed = decisionStates([
      { id: "a", positiveCount: 5, vetoCount: 0 },
      { id: "b", positiveCount: 5, vetoCount: 1 },
      { id: "c", positiveCount: 3, vetoCount: 0 }
    ]);
    expect(Object.fromEntries(mixed)).toEqual({ a: "clear", b: "discussion", c: "none" });

    const fallback = decisionStates([
      { id: "a", positiveCount: 10, vetoCount: 1 },
      { id: "b", positiveCount: 5, vetoCount: 0 },
      { id: "c", positiveCount: 1, vetoCount: 0 }
    ]);
    expect(Object.fromEntries(fallback)).toEqual({ a: "discussion", b: "fallback", c: "none" });

    const zero = decisionStates([
      { id: "a", positiveCount: 0, vetoCount: 0 },
      { id: "b", positiveCount: 0, vetoCount: 1 }
    ]);
    expect(Object.fromEntries(zero)).toEqual({ a: "none", b: "none" });
  });

  test("formats candidate creation time and clamps future timestamps", () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    expect(relativeCandidateTime("2026-07-12T12:30:00.000Z", now)).toBe("1時間以内に追加");
    expect(relativeCandidateTime("2026-07-12T11:30:00.000Z", now)).toBe("1時間以内に追加");
    expect(relativeCandidateTime("2026-07-12T10:00:00.000Z", now)).toBe("2時間前に追加");
    expect(relativeCandidateTime("2026-07-10T12:00:00.000Z", now)).toBe("2日前に追加");
  });

  test("materializes unrated cells and counts every criterion feedback row", () => {
    const state = buildEventState({
      event: {
        id: "event",
        title: "[E2E] state",
        memo: null,
        share_token: "share",
        created_at: "2026-07-12T00:00:00.000Z"
      },
      participants: [
        { id: "p1", event_id: "event", display_name: "[E2E] A", created_at: "2026-07-12T00:00:00.000Z" },
        { id: "p2", event_id: "event", display_name: "[E2E] B", created_at: "2026-07-12T00:00:01.000Z" }
      ],
      candidates: [
        { id: "candidate", event_id: "event", title: "候補", url: null, created_by: null, created_at: "2026-07-12T00:00:00.000Z" }
      ],
      criteria: [
        { id: "criterion-a", event_id: "event", label: "A", source: "default", created_by: null, created_at: "2026-07-12T00:00:00.000Z" },
        { id: "criterion-b", event_id: "event", label: "B", source: "custom", created_by: null, created_at: "2026-07-12T00:00:01.000Z" }
      ],
      votes: [{ id: "vote", candidate_id: "candidate", participant_id: "p1", value: "neutral" }],
      reactions: [
        { id: "r1", candidate_id: "candidate", participant_id: "p1", criterion_id: "criterion-a", created_at: "2026-07-12T00:00:00.000Z" },
        { id: "r2", candidate_id: "candidate", participant_id: "p1", criterion_id: "criterion-b", created_at: "2026-07-12T00:00:00.000Z" }
      ],
      concerns: [
        { id: "c1", candidate_id: "candidate", participant_id: "p1", criterion_id: "criterion-a", created_at: "2026-07-12T00:00:00.000Z" }
      ],
      comments: []
    }, new Date("2026-07-12T00:30:00.000Z"));

    expect(state.candidates[0].respondents.map((row) => row.evaluation)).toEqual([
      "neutral",
      "unrated"
    ]);
    expect(state.candidates[0].heartCount).toBe(2);
    expect(state.candidates[0].concernCount).toBe(1);
  });
});
