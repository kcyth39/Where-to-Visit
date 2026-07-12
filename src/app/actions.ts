"use server";

import { redirect } from "next/navigation";

import {
  createCandidate,
  createCriterion,
  createEvent,
  deleteCandidate,
  deleteCriterion,
  deleteParticipant,
  refreshEventState,
  renameParticipant,
  resolveParticipant,
  saveComment,
  setConcern,
  setReaction,
  setVote,
  updateCandidate,
  updateCriterion,
  updateEvent
} from "@/lib/events";
import type {
  EventState,
  MutationResult,
  ParticipantResolution,
  VoteValue
} from "@/lib/events";

export type CreateEventState = { message: string | null };

export async function createEventAction(
  _previousState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const result = await createEvent(formData);
  if (!result.data) return { message: result.error };
  redirect(`/o/${result.data.ownerToken}?created=1`);
}

export async function refreshEventStateAction(
  eventId: string,
  shareToken: string
): Promise<MutationResult<EventState>> {
  return refreshEventState(eventId, shareToken);
}

export async function updateEventAction(input: {
  eventId: string;
  shareToken: string;
  ownerToken?: string;
  title: string;
  memo: string;
}): Promise<MutationResult<EventState>> {
  return updateEvent(
    input.eventId,
    input.shareToken,
    input.title,
    input.memo,
    input.ownerToken
  );
}

export async function resolveParticipantAction(input: {
  eventId: string;
  shareToken: string;
  displayName: string;
}): Promise<MutationResult<ParticipantResolution>> {
  return resolveParticipant(input.eventId, input.shareToken, input.displayName);
}

export async function renameParticipantAction(input: {
  eventId: string;
  shareToken: string;
  participantId: string;
  displayName: string;
}): Promise<MutationResult<EventState>> {
  return renameParticipant(
    input.eventId,
    input.shareToken,
    input.participantId,
    input.displayName
  );
}

export async function deleteParticipantAction(input: {
  eventId: string;
  shareToken: string;
  participantId: string;
}): Promise<MutationResult<EventState>> {
  return deleteParticipant(input.eventId, input.shareToken, input.participantId);
}

export async function createCandidateAction(input: {
  eventId: string;
  shareToken: string;
  title: string;
  url: string;
  createdBy: string | null;
}): Promise<MutationResult<EventState>> {
  return createCandidate(
    input.eventId,
    input.shareToken,
    input.title,
    input.url,
    input.createdBy
  );
}

export async function updateCandidateAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
  field: "title" | "url" | "created_by";
  value: string | null;
}): Promise<MutationResult<EventState>> {
  return updateCandidate(
    input.eventId,
    input.shareToken,
    input.candidateId,
    input.field,
    input.value
  );
}

export async function deleteCandidateAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
}): Promise<MutationResult<EventState>> {
  return deleteCandidate(input.eventId, input.shareToken, input.candidateId);
}

export async function createCriterionAction(input: {
  eventId: string;
  shareToken: string;
  label: string;
  source: "preset" | "custom";
  createdBy: string | null;
}): Promise<MutationResult<EventState>> {
  return createCriterion(
    input.eventId,
    input.shareToken,
    input.label,
    input.source,
    input.createdBy
  );
}

export async function updateCriterionAction(input: {
  eventId: string;
  shareToken: string;
  criterionId: string;
  label: string;
}): Promise<MutationResult<EventState>> {
  return updateCriterion(
    input.eventId,
    input.shareToken,
    input.criterionId,
    input.label
  );
}

export async function deleteCriterionAction(input: {
  eventId: string;
  shareToken: string;
  criterionId: string;
}): Promise<MutationResult<EventState>> {
  return deleteCriterion(input.eventId, input.shareToken, input.criterionId);
}

export async function setVoteAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
  participantId: string;
  value: VoteValue;
}): Promise<MutationResult<EventState>> {
  return setVote(
    input.eventId,
    input.shareToken,
    input.candidateId,
    input.participantId,
    input.value
  );
}

export async function setReactionAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
  participantId: string;
  criterionId: string;
  enabled: boolean;
}): Promise<MutationResult<EventState>> {
  return setReaction(
    input.eventId,
    input.shareToken,
    input.candidateId,
    input.participantId,
    input.criterionId,
    input.enabled
  );
}

export async function setConcernAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
  participantId: string;
  criterionId: string;
  enabled: boolean;
}): Promise<MutationResult<EventState>> {
  return setConcern(
    input.eventId,
    input.shareToken,
    input.candidateId,
    input.participantId,
    input.criterionId,
    input.enabled
  );
}

export async function saveCommentAction(input: {
  eventId: string;
  shareToken: string;
  candidateId: string;
  participantId: string;
  text: string;
}): Promise<MutationResult<EventState>> {
  return saveComment(
    input.eventId,
    input.shareToken,
    input.candidateId,
    input.participantId,
    input.text
  );
}
