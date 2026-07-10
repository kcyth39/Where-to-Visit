"use client";

import { useState } from "react";

type TwoStepDeleteDialogProps = {
  firstMessage: string;
  triggerLabel: string;
  disabled?: boolean;
  onConfirm: () => Promise<boolean | void>;
};

export function TwoStepDeleteDialog({
  firstMessage,
  triggerLabel,
  disabled = false,
  onConfirm
}: TwoStepDeleteDialogProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function confirmDelete() {
    setIsSubmitting(true);
    const succeeded = await onConfirm();
    setIsSubmitting(false);
    if (succeeded !== false) setStep(0);
  }

  return (
    <>
      <button
        className="danger-button"
        disabled={disabled || isSubmitting}
        type="button"
        onClick={() => setStep(1)}
      >
        {triggerLabel}
      </button>

      {step ? (
        <section
          aria-modal="true"
          className={step === 2 ? "confirm-dialog danger-dialog" : "confirm-dialog"}
          role="dialog"
        >
          <p>{step === 1 ? firstMessage : "本当によろしいですか？"}</p>
          <div className="dialog-actions">
            {step === 1 ? (
              <button
                className="danger-button"
                disabled={disabled || isSubmitting}
                type="button"
                onClick={() => setStep(2)}
              >
                消す
              </button>
            ) : (
              <button
                className="danger-button"
                disabled={disabled || isSubmitting}
                type="button"
                onClick={() => void confirmDelete()}
              >
                消す
              </button>
            )}
            <button
              className="text-button"
              disabled={isSubmitting}
              type="button"
              onClick={() => setStep(0)}
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
