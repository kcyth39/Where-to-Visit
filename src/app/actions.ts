"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCandidateFromForm,
  createCommentFromForm,
  createCriterionFromForm,
  createEventWithOwner,
  deleteCandidateFromForm,
  deleteCommentFromForm,
  deleteCriterionFromForm,
  refreshSlice5StateFromForm,
  removeConcernFromForm,
  removeReactionFromForm,
  toggleConcernFromForm,
  toggleReactionFromForm,
  updateCandidateFieldFromForm,
  updateCandidateProposerFromForm,
  updateCommentFromForm,
  updateCriterionFromForm,
  updateEventFromForm
} from "@/lib/events";
import type { OperationResult, Slice5State } from "@/lib/events";

export type CreateEventState = {
  message: string | null;
};

export async function createEventAction(
  _previousState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const result = await createEventWithOwner(formData);

  if (!result.data) {
    return { message: result.error };
  }

  const { ownerToken } = result.data;
  redirect(`/o/${ownerToken}?created=1`);
}

function appendStatus(path: string, key: string, value: string): string {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

export async function updateEventAction(formData: FormData): Promise<void> {
  const rawReturnTo = formData.get("returnTo");
  const returnTo =
    typeof rawReturnTo === "string" && rawReturnTo.startsWith("/")
      ? rawReturnTo
      : "/";
  const result = await updateEventFromForm(formData);

  if (!result.data) {
    redirect(appendStatus(returnTo, "error", result.error));
  }

  const { shareToken } = result.data;
  revalidatePath(`/e/${shareToken}`);
  redirect(appendStatus(returnTo, "saved", "1"));
}

function getReturnTo(formData: FormData): string {
  const rawReturnTo = formData.get("returnTo");
  return typeof rawReturnTo === "string" && rawReturnTo.startsWith("/")
    ? rawReturnTo
    : "/";
}

async function finishCandidateAction(
  formData: FormData,
  result: { data: unknown; error: string | null }
): Promise<void> {
  const returnTo = getReturnTo(formData);
  if (result.error) {
    redirect(appendStatus(returnTo, "candidateError", result.error));
  }

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function createCandidateAction(formData: FormData): Promise<void> {
  await finishCandidateAction(formData, await createCandidateFromForm(formData));
}

export async function updateCandidateFieldAction(
  formData: FormData
): Promise<void> {
  await finishCandidateAction(formData, await updateCandidateFieldFromForm(formData));
}

export async function updateCandidateProposerAction(
  formData: FormData
): Promise<void> {
  await finishCandidateAction(formData, await updateCandidateProposerFromForm(formData));
}

export async function deleteCandidateAction(formData: FormData): Promise<void> {
  await finishCandidateAction(formData, await deleteCandidateFromForm(formData));
}

export async function refreshSlice5StateAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return refreshSlice5StateFromForm(formData);
}

export async function createCriterionAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return createCriterionFromForm(formData);
}

export async function updateCriterionAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return updateCriterionFromForm(formData);
}

export async function deleteCriterionAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return deleteCriterionFromForm(formData);
}

export async function toggleReactionAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return toggleReactionFromForm(formData);
}

export async function removeReactionAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return removeReactionFromForm(formData);
}

export async function toggleConcernAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return toggleConcernFromForm(formData);
}

export async function removeConcernAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return removeConcernFromForm(formData);
}

export async function createCommentAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return createCommentFromForm(formData);
}

export async function updateCommentAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return updateCommentFromForm(formData);
}

export async function deleteCommentAction(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  return deleteCommentFromForm(formData);
}
