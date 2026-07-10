import type { OperationResult, Slice5State } from "@/lib/events";

export type Slice5Mutation = () => Promise<OperationResult<Slice5State>>;

export type RunSlice5Mutation = (mutation: Slice5Mutation) => Promise<boolean>;

export function createSlice5FormData(
  eventId: string,
  shareToken: string,
  values: Record<string, string> = {}
): FormData {
  const formData = new FormData();
  formData.set("eventId", eventId);
  formData.set("shareToken", shareToken);
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}
