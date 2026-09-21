"use client";

import { useState, useTransition } from "react";
import { Film } from "lucide-react";
import { apiCall } from "../lib/api";
import type { ImportResult } from "../lib/api-types";

export function ForeignWorkImportForm({
  providerFileIds,
  suggestedTitle,
}: {
  providerFileIds: string[];
  suggestedTitle?: string;
}) {
  const [movieTitle, setMovieTitle] = useState(suggestedTitle ?? "");
  const [year, setYear] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.status === "imported") {
    return <p className="import-result success">{result.message}</p>;
  }

  return (
    <form
      className="foreign-import-form"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const r = await apiCall<ImportResult>("/api/acquire", {
            type: "import",
            providerFileIds,
            movieTitle,
            year: Number(year),
          });
          if (!r.ok) {
            setResult({ status: "failed", message: r.error });
            return;
          }
          setResult(r.value);
        });
      }}
    >
      <input
        aria-label="电影名称"
        placeholder="电影名称"
        required
        value={movieTitle}
        onChange={(event) => setMovieTitle(event.target.value)}
      />
      <input
        aria-label="年份"
        placeholder="年份"
        required
        inputMode="numeric"
        pattern="\d{4}"
        value={year}
        onChange={(event) => setYear(event.target.value)}
        style={{ width: 90 }}
      />
      <button className="primary-button" type="submit" disabled={pending}>
        <Film size={15} aria-hidden />
        {pending ? "入库中…" : "作为电影入库"}
      </button>
      {result?.status === "failed" ? <p className="import-result failed">{result.message}</p> : null}
    </form>
  );
}
