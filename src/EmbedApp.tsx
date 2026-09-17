import { useEffect, useMemo, useState } from "react";
import "./sheet.css";
import "./embed.css";
import { enumerateMonths } from "./model";
import { PanelCard, TimetableSheet } from "./TimetableSheet";
import type { TimetableDoc } from "./types";

function jsonUrl(): string {
  const q = new URLSearchParams(window.location.search);
  return q.get("json") ?? "";
}

function isDoc(v: unknown): v is TimetableDoc {
  if (!v || typeof v !== "object") return false;
  const d = v as TimetableDoc;
  return d.version === 1 && !!d.calendar && Array.isArray(d.palette) && Array.isArray(d.panels);
}

function formatWhen(iso: string, letter: string, name: string) {
  let label = iso;
  const parts = iso.split("-");
  if (parts.length >= 3) {
    const dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (!Number.isNaN(dt.getTime())) {
      label = dt.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  if (letter) label += ` · ${letter}${name ? ` ${name}` : ""}`;
  return label;
}

function defaultMonthId(ids: string[]) {
  const now = new Date();
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return ids.includes(id) ? id : (ids[0] ?? "");
}

export function EmbedApp() {
  const [doc, setDoc] = useState<TimetableDoc | null>(null);
  const [error, setError] = useState("");
  const [iso, setIso] = useState("");
  const [letter, setLetter] = useState("");
  const [open, setOpen] = useState(false);
  const [monthId, setMonthId] = useState("");

  useEffect(() => {
    const url = jsonUrl();
    if (!url) {
      setError("Add ?json=https://…/timetable.json to this page.");
      return;
    }
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url}`);
        return r.json();
      })
      .then((data) => {
        if (!isDoc(data)) throw new Error("JSON is not a timetable document.");
        setDoc(data);
        const ids = enumerateMonths(data.calendar.startMonth, data.calendar.monthCount).map((m) => m.id);
        setMonthId(defaultMonthId(ids));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("kwvr-tt-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("kwvr-tt-open");
    };
  }, [open]);

  const months = useMemo(
    () => (doc ? enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount) : []),
    [doc],
  );
  const monthIndex = Math.max(0, months.findIndex((m) => m.id === monthId));
  const month = months[monthIndex] ?? months[0];
  const pal = useMemo(() => doc?.palette.find((p) => p.letter === letter), [doc, letter]);
  const panel = useMemo(() => doc?.panels.find((p) => p.letter === letter), [doc, letter]);

  if (error) return <p className="kwvr-embed-err">{error}</p>;
  if (!doc || !month) return <p className="kwvr-embed-err">Loading timetable…</p>;

  function pick(nextIso: string, nextLetter?: string) {
    setIso(nextIso);
    setLetter(nextLetter ?? "");
    setOpen(true);
  }

  return (
    <div className="kwvr-embed">
      <nav className="kwvr-tt-month-nav" aria-label="Month">
        <button
          type="button"
          className="kwvr-tt-month-btn"
          disabled={monthIndex <= 0}
          onClick={() => setMonthId(months[monthIndex - 1]?.id ?? month.id)}
        >
          Previous
        </button>
        <p className="kwvr-tt-month-title">
          {month.label} {month.year}
        </p>
        <button
          type="button"
          className="kwvr-tt-month-btn"
          disabled={monthIndex >= months.length - 1}
          onClick={() => setMonthId(months[monthIndex + 1]?.id ?? month.id)}
        >
          Next
        </button>
      </nav>
      <TimetableSheet kind="months" doc={doc} monthId={month.id} onDayClick={pick} selectedIso={iso} showEvents />
      {open ? (
        <div className="kwvr-tt-overlay">
          <button type="button" className="kwvr-tt-overlay-backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="kwvr-tt-overlay-card" role="dialog" aria-modal="true">
            <button type="button" className="kwvr-tt-overlay-close" onClick={() => setOpen(false)}>
              Close
            </button>
            <p className="kwvr-tt-overlay-when">{formatWhen(iso, letter, pal?.name ?? "")}</p>
            {panel ? (
              <PanelCard doc={doc} panel={panel} directionMode="stack" />
            ) : (
              <p className="kwvr-tt-overlay-empty">No trains on this day.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
