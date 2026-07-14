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
        <span>きめること</span>
        <div className="wrapping-placeholder-input">
          <input
            name="title"
            type="text"
            required
            maxLength={80}
            placeholder={EVENT_TITLE_PLACEHOLDER}
            disabled={isDisabled}
          />
          <span aria-hidden="true">{EVENT_TITLE_PLACEHOLDER}</span>
        </div>
      </label>

      <label className="field">
        <span>つたえておきたいこと（任意）</span>
        <textarea
          name="memo"
          rows={4}
          maxLength={1000}
          placeholder="決めたい理由や、大切にしたいこと、予算、日程、避けたいことなど"
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
