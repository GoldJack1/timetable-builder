import { useEffect, useMemo, useState } from "react";
import "./editor.css";
import { exampleTimetable } from "./example";
import { downloadJson, downloadText, exportJpg, exportPng } from "./exporters";
import { exportDocSvg, exportEachMonthSvg, exportEachPanelSvg } from "./svgExport";
import { IconPicker, iconSrc } from "./IconPicker";
import {
  calendarStyle,
  clonePanel,
  contrastText,
  emptyPanel,
  emptyService,
  enumerateMonths,
  fillerService,
  MONTH_NAMES,
  moveAt,
  nextLetter,
} from "./model";
import { loadDoc, saveDoc, withoutDamemsIngrowIcons } from "./storage";
import { TimetableSheet, type DirectionMode, type PreviewKind } from "./TimetableSheet";
import type { CalendarStyle, DirectionBlock, PaletteEntry, TimetableDoc } from "./types";
import { wordpressSnippet } from "./wordpress";

const PAGES = [
  { id: "timetables", label: "Times" },
  { id: "editor", label: "Editor" },
  { id: "calendar", label: "Calendar" },
  { id: "colours", label: "Colours" },
  { id: "stations", label: "Stations" },
] as const;

type PageId = (typeof PAGES)[number]["id"];
type CalendarKind = "dates" | "months";
type ExportKind = "png" | "jpg" | "svg" | "svg-panels" | "svg-months";

const HASH_TO_PAGE: Record<string, PageId> = {
  timetables: "timetables",
  calendar: "calendar",
  dates: "calendar",
  months: "calendar",
  colours: "colours",
  setup: "colours",
  stations: "stations",
  editor: "editor",
  edit: "editor",
  file: "timetables",
  export: "timetables",
};

function hashPath(): string {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0];
}

function parseHash(): PageId {
  return HASH_TO_PAGE[hashPath()] ?? "timetables";
}

function calendarKindFromHash(): CalendarKind {
  return hashPath() === "months" ? "months" : "dates";
}

function loadTheme(): "light" | "dark" {
  const v = localStorage.getItem("kwvr-theme");
  if (v === "light" || v === "dark") return v;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function busyLabel(busy: string, idle: string, kind: ExportKind) {
  return busy === kind ? "Saving…" : idle;
}

function MoveIcon({ dir }: { dir: "up" | "down" | "left" | "right" }) {
  const rotate = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg className="move-icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <g
        transform={`rotate(${rotate} 8 8)`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 12V4" />
        <path d="M4.5 7.5 8 4 11.5 7.5" />
      </g>
    </svg>
  );
}

function MoveButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down" | "left" | "right";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="hit icon-hit"
      aria-label={`Move ${dir}`}
      disabled={disabled}
      onClick={onClick}
    >
      <MoveIcon dir={dir} />
    </button>
  );
}

export default function App() {
  const [doc, setDoc] = useState<TimetableDoc>(() => loadDoc());
  const [paint, setPaint] = useState(doc.palette[0]?.letter ?? "A");
  const [panelId, setPanelId] = useState(doc.panels[0]?.id ?? "");
  const [page, setPage] = useState<PageId>(parseHash);
  const [calendarKind, setCalendarKind] = useState<CalendarKind>(calendarKindFromHash);
  const [picker, setPicker] = useState<{ kind: "station" | "service"; id: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [directionMode, setDirectionMode] = useState<DirectionMode>("stack");
  const [svgNoGap, setSvgNoGap] = useState(false);
  const [svgTransparent, setSvgTransparent] = useState(false);
  const [monthViewId, setMonthViewId] = useState("");
  const [hideAdjacentMonths, setHideAdjacentMonths] = useState(false);
  const [exportOpen, setExportOpen] = useState(() => {
    const raw = hashPath();
    return raw === "file" || raw === "export";
  });

  useEffect(() => {
    if (sessionStorage.getItem("kwvr-stripped-damems-ingrow")) return;
    sessionStorage.setItem("kwvr-stripped-damems-ingrow", "1");
    setDoc((d) => withoutDamemsIngrowIcons(d));
  }, []);

  useEffect(() => saveDoc(doc), [doc]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("kwvr-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      const raw = hashPath();
      setPage(parseHash());
      if (raw === "dates" || raw === "months") setCalendarKind(calendarKindFromHash());
      if (raw === "file" || raw === "export") setExportOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/timetables";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(id: PageId) {
    window.location.hash = `#/${id}`;
  }

  const panel = doc.panels.find((p) => p.id === panelId) ?? doc.panels[0];
  const rangeOpts = useMemo(() => {
    const opts = [];
    for (let y = 2025; y <= 2028; y++) {
      for (let m = 0; m < 12; m++) {
        opts.push({
          value: `${y}-${String(m + 1).padStart(2, "0")}`,
          label: `${MONTH_NAMES[m]} ${y}`,
        });
      }
    }
    return opts;
  }, []);

  function update(fn: (d: TimetableDoc) => TimetableDoc) {
    setDoc((d) => fn(d));
  }

  function paintDay(iso: string) {
    update((d) => {
      const cells = { ...d.calendar.cells };
      if (!paint || cells[iso] === paint) delete cells[iso];
      else cells[iso] = paint;
      return { ...d, calendar: { ...d.calendar, cells } };
    });
  }

  const previewKind: PreviewKind = page === "calendar" ? calendarKind : "panel";
  const calendarMonths = useMemo(
    () => enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount),
    [doc.calendar.startMonth, doc.calendar.monthCount],
  );
  const activeMonthId = monthViewId && calendarMonths.some((m) => m.id === monthViewId) ? monthViewId : "";
  const previewTransparent = svgTransparent;
  const paintEntry = doc.palette.find((p) => p.letter === paint);

  async function runExport(kind: ExportKind) {
    setBusy(kind);
    try {
      const name =
        previewKind === "panel"
          ? `timetable-${panel?.letter ?? "panel"}${directionMode === "stack" ? "" : `-${directionMode}`}`
          : previewKind === "dates"
            ? "dates-grid"
            : activeMonthId
              ? `calendar-${activeMonthId}`
              : "dates-months";
      if (kind === "svg-panels") {
        await exportEachPanelSvg({
          doc,
          directionMode,
          noGap: svgNoGap,
          transparent: svgTransparent,
        });
        return;
      }
      if (kind === "svg-months") {
        await exportEachMonthSvg({ doc, transparent: svgTransparent, hideAdjacentMonths });
        return;
      }
      const node = document.getElementById("print-sheet");
      if (!node) return;
      if (kind === "png") await exportPng(node, name, previewTransparent);
      if (kind === "jpg") await exportJpg(node, name);
      if (kind === "svg") {
        await exportDocSvg({
          doc,
          kind: previewKind,
          panelId,
          directionMode,
          name,
          noGap: page === "calendar" ? false : svgNoGap,
          transparent: svgTransparent,
          monthId: previewKind === "months" ? activeMonthId || undefined : undefined,
          hideAdjacentMonths,
        });
      }
    } finally {
      setBusy("");
    }
  }

  function onJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TimetableDoc;
        if (parsed.version !== 1) throw new Error("bad");
        setDoc(parsed);
        setPanelId(parsed.panels[0]?.id ?? "");
      } catch {
        window.alert("That file is not a timetable JSON document.");
      }
    };
    reader.readAsText(file);
  }

  const selectedIcons =
    picker?.kind === "station"
      ? (doc.stations.find((s) => s.id === picker.id)?.iconIds ?? [])
      : picker?.kind === "service"
        ? doc.panels.flatMap((p) => [...p.outbound.services, ...p.inbound.services]).find((s) => s.id === picker.id)
            ?.noteIconIds ?? []
        : [];

  const fileTitle =
    page === "calendar"
      ? "Calendar"
      : page === "colours"
        ? "Colours"
        : page === "stations"
          ? "Stations"
          : page === "editor"
            ? "Editor"
            : "Timetable";

  return (
    <div className="app-shell">
      <nav className="rail" aria-label="Site">
        <div className="rail-brand">Timetable builder</div>
        {PAGES.map((p) => (
          <a
            key={p.id}
            href={`#/${p.id}`}
            className={page === p.id ? "active" : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(p.id);
            }}
          >
            {p.label}
          </a>
        ))}
      </nav>

      <div className="workspace">
        <header className="filebar">
          <span className="filebar-title">{fileTitle}</span>
          <div className="filebar-spacer" />
          <button type="button" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="export-wrap">
            <button className="primary" type="button" onClick={() => setExportOpen((v) => !v)}>
              Export
            </button>
            {exportOpen ? (
              <ExportMenu
                doc={doc}
                busy={busy}
                page={page}
                calendarKind={calendarKind}
                onClose={() => setExportOpen(false)}
                onJsonFile={onJsonFile}
                setDoc={setDoc}
                setPanelId={setPanelId}
                runExport={runExport}
              />
            ) : null}
          </div>
        </header>

        <div className="stage">
          <aside className="sidebar">
            {page === "calendar" ? (
              <CalendarPage
                doc={doc}
                paint={paint}
                setPaint={setPaint}
                rangeOpts={rangeOpts}
                update={update}
                paintEntry={paintEntry}
              />
            ) : page === "colours" ? (
              <ColoursPage doc={doc} setPaint={setPaint} setPanelId={setPanelId} update={update} />
            ) : page === "stations" ? (
              <StationsPage doc={doc} update={update} setPicker={setPicker} />
            ) : (
              <TimesSidebar doc={doc} panelId={panelId} setPanelId={setPanelId} isEditor={page === "editor"} />
            )}
            <PreviewOptions
              showNoGap={page !== "calendar"}
              noGap={svgNoGap}
              setNoGap={setSvgNoGap}
              transparent={svgTransparent}
              setTransparent={setSvgTransparent}
            />
          </aside>
          {page === "editor" && panel ? (
            <main className="editor-page">
              <TimesEditor doc={doc} panel={panel} update={update} setPicker={setPicker} />
              <div className="export-sheet-host">
                <TimetableSheet
                  doc={doc}
                  kind="panel"
                  panelId={panelId}
                  directionMode={directionMode}
                  noGap={svgNoGap}
                  transparent={previewTransparent}
                />
              </div>
            </main>
          ) : (
            <main className="canvas">
              <TimetableSheet
                doc={doc}
                kind={previewKind}
                panelId={panelId}
                directionMode={directionMode}
                noGap={page !== "calendar" ? svgNoGap : false}
                transparent={previewTransparent}
                monthId={page === "calendar" && calendarKind === "months" ? activeMonthId || undefined : undefined}
                hideAdjacentMonths={hideAdjacentMonths}
                onPaint={page === "calendar" ? paintDay : undefined}
              />
            </main>
          )}
        </div>

        {page === "calendar" ? (
          <div className="bottom-bar">
            <button
              type="button"
              className={calendarKind === "dates" ? "primary" : undefined}
              onClick={() => setCalendarKind("dates")}
            >
              Grid
            </button>
            <button
              type="button"
              className={calendarKind === "months" ? "primary" : undefined}
              onClick={() => setCalendarKind("months")}
            >
              Months
            </button>
            {calendarKind === "months" ? (
              <>
                <button type="button" className={!activeMonthId ? "primary" : undefined} onClick={() => setMonthViewId("")}>
                  All
                </button>
                <button
                  type="button"
                  className={activeMonthId ? "primary" : undefined}
                  onClick={() => setMonthViewId(activeMonthId || calendarMonths[0]?.id || "")}
                >
                  Month
                </button>
                {activeMonthId ? (
                  <select value={activeMonthId} onChange={(e) => setMonthViewId(e.target.value)} aria-label="Month">
                    {calendarMonths.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} {m.year}
                      </option>
                    ))}
                  </select>
                ) : null}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={hideAdjacentMonths}
                    onChange={(e) => setHideAdjacentMonths(e.target.checked)}
                  />
                  Hide adjacent
                </label>
              </>
            ) : null}
          </div>
        ) : page !== "editor" ? (
          <div className="bottom-bar">
            {(
              [
                ["stack", "Both"],
                ["outbound", "Outbound"],
                ["inbound", "Inbound"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={directionMode === id ? "primary" : undefined}
                onClick={() => setDirectionMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <IconPicker
        open={!!picker}
        selected={selectedIcons}
        onClose={() => setPicker(null)}
        onPick={(id) => {
          if (!picker) return;
          update((d) => {
            if (picker.kind === "station") {
              return {
                ...d,
                stations: d.stations.map((s) => {
                  if (s.id !== picker.id) return s;
                  const iconIds = s.iconIds.includes(id)
                    ? s.iconIds.filter((x) => x !== id)
                    : [...s.iconIds, id];
                  return { ...s, iconIds };
                }),
              };
            }
            return {
              ...d,
              panels: d.panels.map((p) => ({
                ...p,
                outbound: {
                  ...p.outbound,
                  services: p.outbound.services.map((s) => toggleNote(s, picker.id, id)),
                },
                inbound: {
                  ...p.inbound,
                  services: p.inbound.services.map((s) => toggleNote(s, picker.id, id)),
                },
              })),
            };
          });
        }}
      />
    </div>
  );
}

function patchCalStyle(update: (fn: (d: TimetableDoc) => TimetableDoc) => void, patch: Partial<CalendarStyle>) {
  update((d) => ({
    ...d,
    calendar: { ...d.calendar, style: { ...calendarStyle(d), ...patch } },
  }));
}

function CalendarFillFields({
  label,
  fill,
  opacity,
  onFill,
  onOpacity,
}: {
  label: string;
  fill: string;
  opacity: number;
  onFill: (fill: string) => void;
  onOpacity: (opacity: number) => void;
}) {
  return (
    <div className="row cal-style-row">
      <strong>{label}</strong>
      <input type="color" value={fill} onChange={(e) => onFill(e.target.value)} />
      <label className="check">
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
        />
        %
      </label>
    </div>
  );
}

function PaintPills({
  doc,
  paint,
  setPaint,
}: {
  doc: TimetableDoc;
  paint: string;
  setPaint: (v: string) => void;
}) {
  return (
    <div className="swatches">
      {doc.palette.map((entry) => (
        <button
          key={entry.letter}
          type="button"
          className={paint === entry.letter ? "swatch on" : "swatch"}
          onClick={() => setPaint(entry.letter)}
        >
          <span className="swatch-chip" style={{ background: entry.fill, color: entry.text }}>
            {entry.letter}
          </span>
          {entry.name}
        </button>
      ))}
      <button type="button" className={paint === "" ? "swatch on" : "swatch"} onClick={() => setPaint("")}>
        Eraser
      </button>
    </div>
  );
}

function RangeFields({
  doc,
  rangeOpts,
  update,
}: {
  doc: TimetableDoc;
  rangeOpts: { value: string; label: string }[];
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
}) {
  return (
    <div className="row">
      <label className="field">
        Start
        <select
          value={doc.calendar.startMonth}
          onChange={(e) => update((d) => ({ ...d, calendar: { ...d.calendar, startMonth: e.target.value } }))}
        >
          {rangeOpts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Months
        <select
          value={String(doc.calendar.monthCount)}
          onChange={(e) => update((d) => ({ ...d, calendar: { ...d.calendar, monthCount: Number(e.target.value) } }))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TimesSidebar({
  doc,
  panelId,
  setPanelId,
  isEditor,
}: {
  doc: TimetableDoc;
  panelId: string;
  setPanelId: (id: string) => void;
  isEditor?: boolean;
}) {
  return (
    <section>
      <h1>{isEditor ? "Editor" : "Panels"}</h1>
      <p className="hint">
        {isEditor
          ? "Pick a colour panel, then edit trains and times in the grid."
          : "Pick a colour timetable. Use Editor to change trains and times."}
      </p>
      <div className="colour-tabs">
        {doc.panels.map((p) => {
          const pal = doc.palette.find((x) => x.letter === p.letter);
          const on = p.id === panelId;
          return (
            <button
              key={p.id}
              type="button"
              className={on ? "on" : undefined}
              style={{ background: pal?.fill, color: pal?.text }}
              onClick={() => setPanelId(p.id)}
            >
              {p.letter} {pal?.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarPage({
  doc,
  paint,
  setPaint,
  rangeOpts,
  update,
  paintEntry,
}: {
  doc: TimetableDoc;
  paint: string;
  setPaint: (v: string) => void;
  rangeOpts: { value: string; label: string }[];
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
  paintEntry?: PaletteEntry;
}) {
  return (
    <section className="ed">
      <h1>Calendar</h1>
      <p className="hint">Set the season, then click days in the preview to paint or erase.</p>
      <RangeFields doc={doc} rangeOpts={rangeOpts} update={update} />
      <h3>Paint</h3>
      <PaintPills doc={doc} paint={paint} setPaint={setPaint} />
      <p className="paint-status">
        {paint ? `Painting: ${paint}${paintEntry?.name ? ` ${paintEntry.name}` : ""}` : "Eraser: click a day to clear it"}
      </p>
      <EventLinksEditor doc={doc} update={update} />
    </section>
  );
}

function EventLinksEditor({
  doc,
  update,
}: {
  doc: TimetableDoc;
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
}) {
  const [iso, setIso] = useState(doc.calendar.startMonth + "-01");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const rows = Object.entries(doc.calendar.events ?? {}).flatMap(([day, list]) =>
    list.map((ev, i) => ({ day, i, ...ev })),
  );
  return (
    <>
      <h3>Event links</h3>
      <p className="hint">Shown in the WordPress month. Calendarize it! events on that site are added automatically too.</p>
      <label className="field">
        Date
        <input type="date" value={iso} onChange={(e) => setIso(e.target.value)} />
      </label>
      <label className="field">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Santa Special" />
      </label>
      <label className="field">
        Link
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <button
        type="button"
        onClick={() => {
          const t = title.trim();
          if (!iso || !t) return;
          update((d) => {
            const events = { ...(d.calendar.events ?? {}) };
            events[iso] = [...(events[iso] ?? []), { title: t, url: url.trim() || "#" }];
            return { ...d, calendar: { ...d.calendar, events } };
          });
          setTitle("");
        }}
      >
        Add event
      </button>
      {rows.length ? (
        <ul className="event-rows">
          {rows.map((row) => (
            <li key={`${row.day}-${row.i}`}>
              <span>
                {row.day} · {row.title}
              </span>
              <button
                type="button"
                className="danger"
                onClick={() =>
                  update((d) => {
                    const events = { ...(d.calendar.events ?? {}) };
                    const next = (events[row.day] ?? []).filter((_, i) => i !== row.i);
                    if (next.length) events[row.day] = next;
                    else delete events[row.day];
                    return { ...d, calendar: { ...d.calendar, events } };
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function TimesEditor({
  doc,
  panel,
  update,
  setPicker,
}: {
  doc: TimetableDoc;
  panel: TimetableDoc["panels"][number];
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
  setPicker: (v: { kind: "station" | "service"; id: string }) => void;
}) {
  return (
    <>
      <h1>Times editor</h1>
      <p className="hint">Edit trains, stations, and times for this colour panel. The printed sheet is unchanged.</p>
      {(["outbound", "inbound"] as const).map((dir) => (
        <div className="tt-block" key={dir}>
          <div className="tt-block-head">
            <strong>{dir === "outbound" ? "Outbound" : "Inbound"}</strong>
            <button
              type="button"
              onClick={() =>
                patchDir(update, panel.id, dir, (b) => ({
                  ...b,
                  services: [...b.services, emptyService(b.rows)],
                }))
              }
            >
              Add train
            </button>
            <button
              type="button"
              onClick={() =>
                patchDir(update, panel.id, dir, (b) => ({
                  ...b,
                  services: [...b.services, fillerService(b.rows)],
                }))
              }
            >
              Add filler
            </button>
          </div>
          <div className="tt-scroll">
            <table className="times">
              <thead>
                <tr>
                  <th className="station-col">Station</th>
                  {panel[dir].services.map((s, i) => (
                    <th key={s.id} className={`train-col${s.filler ? " filler-col" : ""}`}>
                      <div className={`train-head${s.filler ? " is-filler" : ""}`}>
                        <span className="train-num">{s.filler ? "—" : i + 1}</span>
                        {s.filler ? (
                          <span className="notes-hit notes-hit-spacer" aria-hidden>
                            Notes
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="notes-hit"
                            aria-label="Notes icons"
                            onClick={() => setPicker({ kind: "service", id: s.id })}
                          >
                            {s.noteIconIds.length ? (
                              s.noteIconIds.map((id) => (
                                <img key={id} className="leaflet-icon" src={iconSrc(id)} alt="" />
                              ))
                            ) : (
                              <span>Notes</span>
                            )}
                          </button>
                        )}
                        <div className="hit-row">
                          <MoveButton
                            dir="left"
                            disabled={i === 0}
                            onClick={() =>
                              patchDir(update, panel.id, dir, (b) => ({
                                ...b,
                                services: moveAt(b.services, i, -1),
                              }))
                            }
                          />
                          <MoveButton
                            dir="right"
                            disabled={i === panel[dir].services.length - 1}
                            onClick={() =>
                              patchDir(update, panel.id, dir, (b) => ({
                                ...b,
                                services: moveAt(b.services, i, 1),
                              }))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="hit danger"
                          aria-label={s.filler ? "Remove filler" : "Remove train"}
                          onClick={() =>
                            patchDir(update, panel.id, dir, (b) => ({
                              ...b,
                              services: b.services.filter((sv) => sv.id !== s.id),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel[dir].rows.map((row, ri) => (
                  <tr key={row.stationId + row.dir + ri}>
                    <td className="station-col">
                      <div className="station-edit">
                        <div className="hit-row">
                          <MoveButton
                            dir="up"
                            disabled={ri === 0}
                            onClick={() =>
                              patchDir(update, panel.id, dir, (b) => ({
                                ...b,
                                rows: moveAt(b.rows, ri, -1),
                              }))
                            }
                          />
                          <MoveButton
                            dir="down"
                            disabled={ri === panel[dir].rows.length - 1}
                            onClick={() =>
                              patchDir(update, panel.id, dir, (b) => ({
                                ...b,
                                rows: moveAt(b.rows, ri, 1),
                              }))
                            }
                          />
                        </div>
                        <span className="name-label">
                          {row.filler
                            ? "—"
                            : (doc.stations.find((st) => st.id === row.stationId)?.name ?? row.stationId)}
                        </span>
                        {row.filler ? null : (
                          <select
                            className="dir-sel"
                            value={row.dir}
                            aria-label="Arrive or depart"
                            onChange={(e) => {
                              const nextDir = e.target.value as "d" | "a" | "";
                              patchDir(update, panel.id, dir, (b) => ({
                                ...b,
                                rows: b.rows.map((r, i) => (i === ri ? { ...r, dir: nextDir } : r)),
                              }));
                            }}
                          >
                            <option value="d">Depart</option>
                            <option value="a">Arrive</option>
                            <option value="">—</option>
                          </select>
                        )}
                        <button
                          type="button"
                          className="hit danger"
                          aria-label="Remove stop"
                          onClick={() =>
                            patchDir(update, panel.id, dir, (b) => ({
                              ...b,
                              rows: b.rows.filter((_, i) => i !== ri),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                    {panel[dir].services.map((s) => (
                      <td key={s.id} className={`train-col${s.filler ? " filler-col" : ""}`}>
                        <input
                          value={s.times[row.stationId]?.value ?? ""}
                          aria-label="Time"
                          onChange={(e) => {
                            const value = e.target.value;
                            patchDir(update, panel.id, dir, (b) => ({
                              ...b,
                              services: b.services.map((sv) =>
                                sv.id !== s.id
                                  ? sv
                                  : {
                                      ...sv,
                                      times: {
                                        ...sv.times,
                                        [row.stationId]: { ...sv.times[row.stationId], value },
                                      },
                                    },
                              ),
                            }));
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function ColoursPage({
  doc,
  setPaint,
  setPanelId,
  update,
}: {
  doc: TimetableDoc;
  setPaint: (v: string) => void;
  setPanelId: (id: string) => void;
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
}) {
  const look = calendarStyle(doc);
  return (
    <>
      <h1>Colours</h1>
      <p className="hint">Letter S is calendar-only and does not create a timetable panel.</p>
      {doc.palette.map((entry, i) => (
        <div className="colour-card" key={entry.letter}>
          <div className="colour-card-top">
            <input
              className="colour-letter"
              type="text"
              aria-label="Letter"
              value={entry.letter}
              onChange={(e) => renameLetter(doc, entry.letter, e.target.value, update, setPaint)}
            />
            <input
              type="text"
              style={{ width: 120 }}
              aria-label="Colour name"
              value={entry.name}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  palette: d.palette.map((p) => (p.letter === entry.letter ? { ...p, name: e.target.value } : p)),
                }))
              }
            />
            <input
              type="color"
              aria-label="Fill colour"
              value={entry.fill}
              onChange={(e) => {
                const fill = e.target.value;
                const text = contrastText(fill);
                update((d) => ({
                  ...d,
                  palette: d.palette.map((p) => (p.letter === entry.letter ? { ...p, fill, text } : p)),
                }));
              }}
            />
          </div>
          <div className="colour-card-actions">
            <MoveButton
              dir="up"
              disabled={i === 0}
              onClick={() => update((d) => reorderColour(d, entry.letter, -1))}
            />
            <MoveButton
              dir="down"
              disabled={i === doc.palette.length - 1}
              onClick={() => update((d) => reorderColour(d, entry.letter, 1))}
            />
            <button
              type="button"
              onClick={() => {
                const letter = nextLetter(doc.palette);
                const copy: PaletteEntry = { letter, name: entry.name, fill: entry.fill, text: entry.text };
                const srcPanel = doc.panels.find((p) => p.letter === entry.letter);
                const nextPanel =
                  letter === "S" ? null : srcPanel ? clonePanel(srcPanel, letter) : emptyPanel(letter, doc.stations);
                update((d) => ({
                  ...d,
                  palette: [...d.palette, copy],
                  panels: nextPanel ? [...d.panels, nextPanel] : d.panels,
                }));
                setPaint(letter);
                if (nextPanel) setPanelId(nextPanel.id);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() =>
                update((d) => ({
                  ...d,
                  palette: d.palette.filter((p) => p.letter !== entry.letter),
                  panels: d.panels.filter((p) => p.letter !== entry.letter),
                  calendar: {
                    ...d.calendar,
                    cells: Object.fromEntries(Object.entries(d.calendar.cells).filter(([, L]) => L !== entry.letter)),
                  },
                }))
              }
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const letter = nextLetter(doc.palette);
          const fill = "#444444";
          const entry: PaletteEntry = { letter, name: `Panel ${letter}`, fill, text: contrastText(fill) };
          update((d) => ({
            ...d,
            palette: [...d.palette, entry],
            panels: letter === "S" ? d.panels : [...d.panels, emptyPanel(letter, d.stations)],
          }));
          setPaint(letter);
        }}
      >
        Add letter
      </button>
      <h2>Calendar fills</h2>
      <CalendarFillFields
        label="Non-running days"
        fill={look.nonRunningFill}
        opacity={look.nonRunningOpacity}
        onFill={(nonRunningFill) => patchCalStyle(update, { nonRunningFill })}
        onOpacity={(nonRunningOpacity) => patchCalStyle(update, { nonRunningOpacity })}
      />
      <CalendarFillFields
        label="Other months"
        fill={look.otherMonthsFill}
        opacity={look.otherMonthsOpacity}
        onFill={(otherMonthsFill) => patchCalStyle(update, { otherMonthsFill })}
        onOpacity={(otherMonthsOpacity) => patchCalStyle(update, { otherMonthsOpacity })}
      />
    </>
  );
}

function StationsPage({
  doc,
  update,
  setPicker,
}: {
  doc: TimetableDoc;
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void;
  setPicker: (v: { kind: "station" | "service"; id: string }) => void;
}) {
  return (
    <>
      <h1>Stations</h1>
      <p className="hint">Names and icons appear on the timetable canvas.</p>
      {doc.stations.map((s) => (
        <div className="station-card" key={s.id}>
          <input
            type="text"
            aria-label="Station name"
            value={s.name}
            onChange={(e) =>
              update((d) => ({
                ...d,
                stations: d.stations.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)),
              }))
            }
          />
          {s.iconIds.map((id) => (
            <span className="chip" key={id}>
              <img className="leaflet-icon" src={iconSrc(id)} alt="" />
            </span>
          ))}
          <button type="button" onClick={() => setPicker({ kind: "station", id: s.id })}>
            Icons
          </button>
        </div>
      ))}
    </>
  );
}

function PreviewOptions({
  showNoGap,
  noGap,
  setNoGap,
  transparent,
  setTransparent,
}: {
  showNoGap: boolean;
  noGap: boolean;
  setNoGap: (v: boolean) => void;
  transparent: boolean;
  setTransparent: (v: boolean) => void;
}) {
  return (
    <section className="preview-options">
      <h2>Options</h2>
      {showNoGap ? (
        <label className="check">
          <input type="checkbox" checked={noGap} onChange={(e) => setNoGap(e.target.checked)} />
          No gap
        </label>
      ) : null}
      <label className="check">
        <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
        Transparent
      </label>
    </section>
  );
}

function ExportMenu({
  doc,
  busy,
  page,
  calendarKind,
  onClose,
  onJsonFile,
  setDoc,
  setPanelId,
  runExport,
}: {
  doc: TimetableDoc;
  busy: string;
  page: PageId;
  calendarKind: CalendarKind;
  onClose: () => void;
  onJsonFile: (file: File) => void;
  setDoc: (d: TimetableDoc) => void;
  setPanelId: (id: string) => void;
  runExport: (kind: ExportKind) => void;
}) {
  return (
    <div className="popover" role="dialog" aria-label="Export">
      <h2>This view</h2>
      <div className="file-actions">
        <button className="primary" type="button" disabled={!!busy} onClick={() => runExport("png")}>
          {busyLabel(busy, "PNG", "png")}
        </button>
        <button type="button" disabled={!!busy} onClick={() => runExport("jpg")}>
          {busyLabel(busy, "JPG", "jpg")}
        </button>
        <button type="button" disabled={!!busy} onClick={() => runExport("svg")}>
          {busyLabel(busy, "SVG", "svg")}
        </button>
      </div>
      <h2>All files</h2>
      <div className="file-actions">
        <button type="button" disabled={!!busy} onClick={() => runExport("svg-panels")}>
          {busyLabel(busy, "SVG each panel", "svg-panels")}
        </button>
        <button type="button" disabled={!!busy} onClick={() => runExport("svg-months")}>
          {busyLabel(busy, "SVG each month", "svg-months")}
        </button>
      </div>
      <h2>Document</h2>
      <div className="file-actions">
        <button type="button" onClick={() => downloadJson(doc, "timetable")}>
          Save JSON
        </button>
        <label className="field" style={{ margin: 0 }}>
          Load JSON
          <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && onJsonFile(e.target.files[0])} />
        </label>
        <button
          type="button"
          onClick={() => downloadText(wordpressSnippet(doc), "timetable-wordpress.html", "text/html")}
        >
          WordPress HTML
        </button>
        <button
          type="button"
          onClick={() => {
            const next = exampleTimetable();
            setDoc(next);
            setPanelId(next.panels[0]?.id ?? "");
          }}
        >
          Reset example
        </button>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        {calendarKind === "months" && page === "calendar"
          ? "Month view exports the calendar cards."
          : page === "editor"
            ? "PNG, JPG, and SVG export the selected colour panel."
            : "PNG, JPG, and SVG use the canvas in front of you."}
      </p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function patchDir(
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void,
  panelId: string,
  dir: "outbound" | "inbound",
  fn: (b: DirectionBlock) => DirectionBlock,
) {
  update((d) => ({
    ...d,
    panels: d.panels.map((p) => (p.id !== panelId ? p : { ...p, [dir]: fn(p[dir]) })),
  }));
}

function reorderColour(d: TimetableDoc, letter: string, delta: number): TimetableDoc {
  const index = d.palette.findIndex((p) => p.letter === letter);
  const palette = moveAt(d.palette, index, delta);
  const order = new Map(palette.map((p, i) => [p.letter, i]));
  const panels = [...d.panels].sort((a, b) => (order.get(a.letter) ?? 99) - (order.get(b.letter) ?? 99));
  return { ...d, palette, panels };
}

function toggleNote<T extends { id: string; noteIconIds: string[] }>(s: T, serviceId: string, iconId: string): T {
  if (s.id !== serviceId) return s;
  const noteIconIds = s.noteIconIds.includes(iconId)
    ? s.noteIconIds.filter((x) => x !== iconId)
    : [...s.noteIconIds, iconId];
  return { ...s, noteIconIds };
}

function renameLetter(
  doc: TimetableDoc,
  from: string,
  raw: string,
  update: (fn: (d: TimetableDoc) => TimetableDoc) => void,
  setPaint: (v: string) => void,
) {
  const to = raw.trim().toUpperCase().slice(0, 2);
  if (!to || to === from || doc.palette.some((p) => p.letter === to)) return;
  update((d) => ({
    ...d,
    palette: d.palette.map((p) => (p.letter === from ? { ...p, letter: to } : p)),
    panels: d.panels.map((p) => (p.letter === from ? { ...p, letter: to } : p)),
    calendar: {
      ...d.calendar,
      cells: Object.fromEntries(Object.entries(d.calendar.cells).map(([iso, L]) => [iso, L === from ? to : L])),
    },
  }));
  setPaint(to);
}
