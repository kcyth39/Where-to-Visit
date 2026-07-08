"use client";

import { useEffect, useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "コピー" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className="copy-button"
      data-copy-ready={ready ? "true" : "false"}
      type="button"
      onClick={copyToClipboard}
    >
      {copied ? "コピー済み" : label}
    </button>
  );
}
