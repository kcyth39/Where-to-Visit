"use client";

import { useActionState, useState } from "react";

import { createEventAction, type CreateEventState } from "@/app/actions";
import {
  EVENT_ATTRIBUTES,
  EVENT_TITLE_PLACEHOLDER_UNSELECTED,
  EVENT_TITLE_PLACEHOLDERS,
  type EventAttribute
} from "@/lib/constants";

const initialState: CreateEventState = {
  message: null
};

type CreateEventFormProps = {
  disabled?: boolean;
};

export function CreateEventForm({ disabled = false }: CreateEventFormProps) {
  const [selectedAttribute, setSelectedAttribute] =
    useState<EventAttribute | null>(null);
  const [state, formAction, pending] = useActionState(
    createEventAction,
    initialState
  );
  const isDisabled = disabled || pending;
  const titlePlaceholder = selectedAttribute
    ? EVENT_TITLE_PLACEHOLDERS[selectedAttribute]
    : EVENT_TITLE_PLACEHOLDER_UNSELECTED;

  return (
    <form className="form-stack" action={formAction}>
      <fieldset className="field">
        <legend>どんなこと？</legend>
        <div className="segmented">
          {EVENT_ATTRIBUTES.map((attribute) => (
            <label key={attribute.value}>
              <input
                type="radio"
                name="attribute"
                value={attribute.value}
                required
                disabled={isDisabled}
                onChange={() => setSelectedAttribute(attribute.value)}
              />
              <span>{attribute.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>お題</span>
        <input
          name="title"
          type="text"
          required
          maxLength={80}
          placeholder={titlePlaceholder}
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

      <label className="field">
        <span>おなまえ</span>
        <input
          name="ownerName"
          type="text"
          required
          maxLength={60}
          placeholder="きめの すけざえもん"
          disabled={isDisabled}
        />
      </label>

      {state.message ? (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={isDisabled}>
        {pending ? "つくってます" : "きめよう！"}
      </button>
    </form>
  );
}
