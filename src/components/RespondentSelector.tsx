"use client";

import type { FocusEvent, KeyboardEvent } from "react";

import type { ParticipantRecord } from "@/lib/events";

type RespondentSelectorProps = {
  participants: ParticipantRecord[];
  draft: string;
  error?: string | null;
  disabled?: boolean;
  onDraftChange: (value: string) => void;
  onSelect: (participant: ParticipantRecord) => void;
  onCommit: (reason: "enter" | "blur") => void;
};

export function RespondentSelector({
  participants,
  draft,
  error,
  disabled = false,
  onDraftChange,
  onSelect,
  onCommit
}: RespondentSelectorProps) {
  function commitOnOuterBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) onCommit("blur");
  }

  function commitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onCommit("enter");
  }

  return (
    <div className="respondent-selector" onBlur={commitOnOuterBlur}>
      <div className="respondent-options" aria-label="登録済みのお名前">
        {participants.map((participant) => (
          <button
            className="respondent-option"
            disabled={disabled}
            key={participant.id}
            type="button"
            onClick={() => onSelect(participant)}
          >
            {participant.display_name}
          </button>
        ))}
      </div>
      <label className="field respondent-input">
        <span>直接入力</span>
        <input
          aria-label="直接入力"
          disabled={disabled}
          maxLength={60}
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={commitOnEnter}
        />
      </label>
      {error ? (
        <p className="form-message error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
