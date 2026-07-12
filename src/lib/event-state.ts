import type {
  CandidateRecord,
  CandidateSummary,
  CommentRecord,
  ConcernRecord,
  CriterionRecord,
  DecisionState,
  EventRecord,
  EventState,
  ParticipantRecord,
  ReactionRecord,
  VoteRecord
} from "@/lib/event-types";

type RawEventState = {
  event: EventRecord;
  participants: ParticipantRecord[];
  candidates: CandidateRecord[];
  criteria: CriterionRecord[];
  votes: VoteRecord[];
  reactions: ReactionRecord[];
  concerns: ConcernRecord[];
  comments: CommentRecord[];
};

export function relativeCandidateTime(
  createdAt: string,
  now = new Date()
): string {
  const created = new Date(createdAt).getTime();
  const elapsedMs = Math.max(0, now.getTime() - created);
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));

  if (hours < 1) return "1時間以内に追加";
  if (hours < 24) return `${hours}時間前に追加`;
  return `${Math.floor(hours / 24)}日前に追加`;
}

export function decisionStates(
  rows: Array<{ id: string; positiveCount: number; vetoCount: number }>
): Map<string, DecisionState> {
  const result = new Map(rows.map((row) => [row.id, "none" as DecisionState]));
  const maxPositive = Math.max(0, ...rows.map((row) => row.positiveCount));
  if (maxPositive === 0) return result;

  let hasClear = false;
  for (const row of rows) {
    if (row.positiveCount !== maxPositive) continue;
    if (row.vetoCount === 0) {
      result.set(row.id, "clear");
      hasClear = true;
    } else {
      result.set(row.id, "discussion");
    }
  }

  if (hasClear) return result;

  const safeRows = rows.filter(
    (row) => row.positiveCount < maxPositive && row.vetoCount === 0
  );
  const fallbackPositive = Math.max(-1, ...safeRows.map((row) => row.positiveCount));
  for (const row of safeRows) {
    if (row.positiveCount === fallbackPositive) result.set(row.id, "fallback");
  }

  return result;
}

export function buildEventState(raw: RawEventState, now = new Date()): EventState {
  const participants = [...raw.participants].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
  );
  const criteria = [...raw.criteria].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
  );
  const candidates = [...raw.candidates].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
  );

  const summaries = candidates.map<CandidateSummary>((candidate) => {
    const candidateVotes = raw.votes.filter((row) => row.candidate_id === candidate.id);
    const candidateReactions = raw.reactions.filter(
      (row) => row.candidate_id === candidate.id
    );
    const candidateConcerns = raw.concerns.filter(
      (row) => row.candidate_id === candidate.id
    );
    const candidateComments = raw.comments.filter(
      (row) => row.candidate_id === candidate.id
    );

    return {
      candidate,
      proposerName:
        participants.find((participant) => participant.id === candidate.created_by)
          ?.display_name ?? null,
      positiveCount: candidateVotes.filter((row) => row.value === "positive").length,
      neutralCount: candidateVotes.filter((row) => row.value === "neutral").length,
      vetoCount: candidateVotes.filter((row) => row.value === "veto").length,
      heartCount: candidateReactions.length,
      concernCount: candidateConcerns.length,
      decisionState: "none",
      relativeCreatedAt: relativeCandidateTime(candidate.created_at, now),
      respondents: participants.map((participant) => ({
        participant,
        evaluation:
          candidateVotes.find((row) => row.participant_id === participant.id)?.value ??
          "unrated",
        reactionCriterionIds: candidateReactions
          .filter((row) => row.participant_id === participant.id)
          .map((row) => row.criterion_id),
        concernCriterionIds: candidateConcerns
          .filter((row) => row.participant_id === participant.id)
          .map((row) => row.criterion_id),
        comment:
          candidateComments.find((row) => row.participant_id === participant.id) ?? null
      }))
    };
  });

  const states = decisionStates(
    summaries.map((summary) => ({
      id: summary.candidate.id,
      positiveCount: summary.positiveCount,
      vetoCount: summary.vetoCount
    }))
  );

  return {
    event: raw.event,
    participants,
    criteria,
    candidates: summaries.map((summary) => ({
      ...summary,
      decisionState: states.get(summary.candidate.id) ?? "none"
    }))
  };
}
