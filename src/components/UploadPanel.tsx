"use client";

import { ChangeEvent } from "react";

interface UploadPanelProps {
  title: string;
  description: string;
  accept: string;
  fileName: string | null;
  onFileSelect: (file: File | null) => void;
  inputId: string;
}

export default function UploadPanel({
  title,
  description,
  accept,
  fileName,
  onFileSelect,
  inputId,
}: UploadPanelProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    onFileSelect(file);
  }

  return (
    <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {description}
      </p>

      <div className="mt-4">
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#171a1f] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
      </div>

      {fileName && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Selected: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{fileName}</span>
        </p>
      )}
    </div>
  );
}
