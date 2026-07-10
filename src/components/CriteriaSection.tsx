"use client";

import { useState } from "react";

import {
  createCriterionAction,
  deleteCriterionAction,
  updateCriterionAction
} from "@/app/actions";
import {
  createSlice5FormData,
  type RunSlice5Mutation
} from "@/components/Slice5Mutation";
import { TwoStepDeleteDialog } from "@/components/TwoStepDeleteDialog";
import { CRITERION_PRESETS } from "@/lib/constants";
import type { CriterionRecord } from "@/lib/events";

type CriteriaSectionProps = {
  eventId: string;
  shareToken: string;
  criteria: CriterionRecord[];
  disabled: boolean;
  runMutation: RunSlice5Mutation;
};

function CriterionItem({
  criterion,
  eventId,
  shareToken,
  disabled,
  runMutation
}: {
  criterion: CriterionRecord;
  eventId: string;
  shareToken: string;
  disabled: boolean;
  runMutation: RunSlice5Mutation;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(criterion.label);
  const [isConfirming, setIsConfirming] = useState(false);

  async function updateCriterion() {
    const formData = createSlice5FormData(eventId, shareToken, {
      criterionId: criterion.id,
      label: draft
    });
    const succeeded = await runMutation(() => updateCriterionAction(formData));
    if (succeeded) {
      setIsConfirming(false);
      setIsEditing(false);
    }
  }

  return (
    <li className="criterion-item">
      <div className="criterion-row">
        <strong>{criterion.label}</strong>
        <div className="compact-actions">
          <button
            className="text-button"
            disabled={disabled}
            type="button"
            onClick={() => {
              setDraft(criterion.label);
              setIsEditing((value) => !value);
            }}
          >
            直す
          </button>
          <TwoStepDeleteDialog
            disabled={disabled}
            firstMessage="この判断基準を消しますか？"
            triggerLabel="消す"
            onConfirm={() =>
              runMutation(() =>
                deleteCriterionAction(
                  createSlice5FormData(eventId, shareToken, {
                    criterionId: criterion.id
                  })
                )
              )
            }
          />
        </div>
      </div>

      {isEditing ? (
        <form
          className="criterion-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            setIsConfirming(true);
          }}
        >
          <label className="field">
            <span className="sr-only">判断基準</span>
            <input
              aria-label={`${criterion.label}を編集`}
              disabled={disabled}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={disabled} type="submit">
            変更
          </button>
        </form>
      ) : null}

      {isConfirming ? (
        <section aria-modal="true" className="confirm-dialog" role="dialog">
          <p>変更します、よろしいですか？</p>
          <div className="dialog-actions">
            <button
              className="primary-button"
              disabled={disabled}
              type="button"
              onClick={() => void updateCriterion()}
            >
              変更
            </button>
            <button
              className="text-button"
              disabled={disabled}
              type="button"
              onClick={() => setIsConfirming(false)}
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : null}
    </li>
  );
}

export function CriteriaSection({
  eventId,
  shareToken,
  criteria,
  disabled,
  runMutation
}: CriteriaSectionProps) {
  const [customLabel, setCustomLabel] = useState("");
  const existingLabels = new Set(criteria.map((criterion) => criterion.label.trim()));

  async function addCriterion(label: string, source: "preset" | "custom") {
    const succeeded = await runMutation(() =>
      createCriterionAction(
        createSlice5FormData(eventId, shareToken, { label, source })
      )
    );
    if (succeeded && source === "custom") setCustomLabel("");
  }

  return (
    <section className="criteria-section" aria-labelledby="criteria-heading">
      <div className="section-heading">
        <h2 id="criteria-heading">判断基準</h2>
        <p>候補を比べるものさしです。追加・変更は誰でもできます。</p>
      </div>

      <div className="criterion-presets" aria-label="判断基準の選択肢">
        {CRITERION_PRESETS.filter((preset) => !existingLabels.has(preset)).map(
          (preset) => (
            <button
              className="preset-button"
              disabled={disabled}
              key={preset}
              type="button"
              onClick={() => void addCriterion(preset, "preset")}
            >
              {preset}
            </button>
          )
        )}
      </div>

      <form
        className="criterion-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          void addCriterion(customLabel, "custom");
        }}
      >
        <label className="field">
          <span className="sr-only">自由記述の判断基準</span>
          <input
            aria-label="自由記述の判断基準"
            disabled={disabled}
            placeholder="例）雰囲気どう？ など"
            type="text"
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={disabled} type="submit">
          追加
        </button>
      </form>

      <ul className="criterion-list">
        {criteria.map((criterion) => (
          <CriterionItem
            criterion={criterion}
            disabled={disabled}
            eventId={eventId}
            key={criterion.id}
            runMutation={runMutation}
            shareToken={shareToken}
          />
        ))}
      </ul>
    </section>
  );
}
