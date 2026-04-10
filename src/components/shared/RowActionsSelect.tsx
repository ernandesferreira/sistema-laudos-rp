"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RowActionOption = {
  value: string;
  label: string;
  href: string;
  openInNewTab?: boolean;
};

type RowActionsSelectProps = {
  options: RowActionOption[];
  placeholder?: string;
  className?: string;
};

export function RowActionsSelect({
  options,
  placeholder = "Acoes",
  className,
}: RowActionsSelectProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState("");

  function handleActionChange(nextValue: string) {
    setSelectedAction(nextValue);

    if (!nextValue) {
      return;
    }

    const selected = options.find((option) => option.value === nextValue);

    if (!selected) {
      setSelectedAction("");
      return;
    }

    if (selected.openInNewTab) {
      window.open(selected.href, "_blank");
      setSelectedAction("");
      return;
    }

    router.push(selected.href);
    setSelectedAction("");
  }

  return (
    <select
      className={
        className ?? "input h-8 min-w-[150px] max-w-[160px] pr-7 !text-[0.60rem] leading-none"
      }
      value={selectedAction}
      onChange={(event) => handleActionChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
