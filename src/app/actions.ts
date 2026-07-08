"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createEventWithOwner,
  updateEventFromForm
} from "@/lib/events";

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
