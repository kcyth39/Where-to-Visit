"use client";

import { useActionState } from "react";

import { createEventAction, type CreateEventState } from "@/app/actions";
import { EVENT_TITLE_PLACEHOLDER } from "@/lib/constants";

const initialState: CreateEventState = {
  message: null
};

type CreateEventFormProps = {
  disabled?: boolean;
};

export function CreateEventForm({ disabled = false }: CreateEventFormProps) {
  const [state, formAction, pending] = useActionState(
    createEventAction,
    initialState
  );
  const isDisabled = disabled || pending;

  return (
    <form className="form-stack" action={formAction}>
      <label className="field">
        <span>お題</span>
        <input
          name="title"
          type="text"
          required
          maxLength={80}
          placeholder={EVENT_TITLE_PLACEHOLDER}
          disabled={isDisabled}
        />
      </label>

      <label className="field">
        <span>メモ</span>
        <textarea
          name="memo"
          rows={4}
          maxLength={1000}
          placeholder="きめたいこと、条件など"
          disabled={isDisabled}
        />
      </label>

      {state.message ? (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={isDisabled}>
        {pending ? "作ってます" : "きめよう！"}
      </button>
    </form>
  );
}
