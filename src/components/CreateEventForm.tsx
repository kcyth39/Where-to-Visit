"use client";

import { useActionState } from "react";

import { createEventAction, type CreateEventState } from "@/app/actions";
import { EVENT_ATTRIBUTES } from "@/lib/constants";

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
        <span>イベント名</span>
        <input
          name="title"
          type="text"
          required
          maxLength={80}
          placeholder="週末の夕食"
          disabled={isDisabled}
        />
      </label>

      <label className="field">
        <span>メモ</span>
        <textarea
          name="memo"
          rows={4}
          maxLength={1000}
          placeholder="決めたいこと、条件など"
          disabled={isDisabled}
        />
      </label>

      <fieldset className="field">
        <legend>属性</legend>
        <div className="segmented">
          {EVENT_ATTRIBUTES.map((attribute) => (
            <label key={attribute.value}>
              <input
                type="radio"
                name="attribute"
                value={attribute.value}
                required
                disabled={isDisabled}
              />
              <span>{attribute.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>作成者名</span>
        <input
          name="ownerName"
          type="text"
          required
          maxLength={60}
          placeholder="おしげ"
          disabled={isDisabled}
        />
      </label>

      {state.message ? (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={isDisabled}>
        {pending ? "作成中" : "作成"}
      </button>
    </form>
  );
}
