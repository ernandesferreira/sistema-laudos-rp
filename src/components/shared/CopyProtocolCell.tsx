"use client";

import { useState } from "react";

type CopyProtocolCellProps = {
  protocol: string;
  className?: string;
  copyLabel?: string;
};

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyProtocolCell({ protocol, className, copyLabel = "protocolo" }: CopyProtocolCellProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyText(protocol);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={className ?? "inline-flex items-center gap-2 whitespace-nowrap"}>
      <span className="text-xs font-semibold text-slate-100">{protocol}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
        title={copied ? "Copiado" : `Copiar ${copyLabel}`}
        aria-label={copied ? `${copyLabel} copiado` : `Copiar ${copyLabel}`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
