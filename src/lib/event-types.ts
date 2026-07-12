export type EventRecord = {
  id: string;
  title: string;
  memo: string | null;
  share_token: string;
  created_at: string;
};

export type ParticipantRecord = {
  id: string;
  event_id: string;
  display_name: string;
  created_at: string;
};

export type CandidateRecord = {
  id: string;
  event_id: string;
  title: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
};

export type CriterionSource = "default" | "preset" | "custom";

export type CriterionRecord = {
  id: string;
  event_id: string;
  label: string;
  source: CriterionSource;
  created_by: string | null;
  created_at: string;
};

export type VoteValue = "positive" | "neutral" | "veto";
export type EvaluationState = "unrated" | VoteValue;

export type VoteRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  value: VoteValue;
};

export type ReactionRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  criterion_id: string;
  created_at: string;
};

export type ConcernRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  criterion_id: string;
  created_at: string;
};

export type CommentRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

export type DecisionState = "clear" | "discussion" | "fallback" | "none";

export type RespondentCandidateView = {
  participant: ParticipantRecord;
  evaluation: EvaluationState;
  reactionCriterionIds: string[];
  concernCriterionIds: string[];
  comment: CommentRecord | null;
};

export type CandidateSummary = {
  candidate: CandidateRecord;
  proposerName: string | null;
  positiveCount: number;
  neutralCount: number;
  vetoCount: number;
  heartCount: number;
  concernCount: number;
  decisionState: DecisionState;
  relativeCreatedAt: string;
  respondents: RespondentCandidateView[];
};

export type EventState = {
  event: EventRecord;
  participants: ParticipantRecord[];
  criteria: CriterionRecord[];
  candidates: CandidateSummary[];
};

export type EventPageModel = {
  state: EventState;
  isOwner: boolean;
};

export type MutationResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ParticipantResolution =
  | {
      status: "selected";
      participant: ParticipantRecord;
      state: EventState;
    }
  | {
      status: "duplicate";
      participant: ParticipantRecord;
    };

export type PendingOperation = {
  id: string;
  kind: "candidate" | "criterion" | "vote" | "reaction" | "concern" | "comment";
};
