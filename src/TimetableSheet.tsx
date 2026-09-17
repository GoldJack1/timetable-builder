import { useEffect, useState } from "react";
import "./sheet.css";
import { loadIconGeom } from "./iconSvg";
import {
  calendarStyle,
  cssFill,
  enumerateMonths,
  isoDate,
  monthGridSlots,
  paletteFor,
  stationIcons,
  stationName,
  WEEKDAYS_MON,
} from "./model";
import type { DirectionBlock, Panel, TimetableDoc } from "./types";

export type PreviewKind = "panel" | "dates" | "months";
export type DirectionMode = "stack" | "outbound" | "inbound";

function tintFill(hex: string): string {
  const raw = hex.replace("#", "").trim();
  const h = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return "#f2f2f2";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${Math.round(r * 0.25 + 255 * 0.75)}, ${Math.round(g * 0.25 + 255 * 0.75)}, ${Math.round(b * 0.25 + 255 * 0.75)})`;
}

function FittedIcon({ id, size }: { id: string; size: number }) {
  const [mark, setMark] = useState<{ vb: string; inner: string; ratio: number } | null>(null);
  useEffect(() => {
    let live = true;
    loadIconGeom(id).then((g) => {
      if (!live || !g) return;
      setMark({ vb: g.vb, inner: g.inner, ratio: g.width / g.height });
    });
    return () => {
      live = false;
    };
  }, [id]);
  if (!mark) return null;
  return (
    <svg
      className="icon-mark"
      viewBox={mark.vb}
      aria-hidden
      style={{ width: `${mark.ratio * size}px`, height: size }}
      dangerouslySetInnerHTML={{ __html: mark.inner }}
    />
  );
}

function IconStrip({ ids, kind }: { ids: string[]; kind: "notes" | "station" }) {
  if (!ids.length) return null;
  return (
    <span className={`icons icons-${kind}`}>
      {ids.map((id) => (
        <FittedIcon key={id} id={id} size={12} />
      ))}
    </span>
  );
}

function Block({
  doc,
  block,
  banner,
  accent,
  transparent,
  flushTop,
  followNotes,
}: {
  doc: TimetableDoc;
  block: DirectionBlock;
  banner?: { label: string; fill: string; text: string };
  accent: { fill: string; text: string };
  transparent?: boolean;
  flushTop?: boolean;
  followNotes?: boolean;
}) {
  const cols = 2 + block.services.length;
  const notesOnDark = accent.text.toLowerCase() === "#fff" || accent.text.toLowerCase() === "#ffffff";
  const stripe = tintFill(accent.fill);
  const notesStyle = { background: accent.fill, color: accent.text };
  return (
    <table
      className="panel-table"
      style={{
        border: `2px solid ${accent.fill}`,
        ...(flushTop ? { borderTopWidth: 0 } : {}),
      }}
    >
      <colgroup>
        <col className="name" />
        <col className="dir" />
        {block.services.map((s) => (
          <col key={s.id} className="time" />
        ))}
      </colgroup>
      <tbody>
        {banner ? (
          <tr className="panel-banner">
            <td colSpan={cols} style={{ background: banner.fill, color: banner.text }}>
              {banner.label}
            </td>
          </tr>
        ) : null}
        <tr className={`notes-row${notesOnDark ? " notes-on-dark" : ""}${followNotes ? " notes-row-follow" : ""}`}>
          <td className="name" style={notesStyle}>
            <span className="notes-label">Notes</span>
          </td>
          <td style={notesStyle} />
          {block.services.map((s) => (
            <td key={s.id} className="time" style={notesStyle}>
              <IconStrip kind="notes" ids={s.noteIconIds} />
            </td>
          ))}
        </tr>
        {block.rows.map((row, i) => {
          const bg = i % 2 === 1 ? stripe : transparent ? "transparent" : "#ffffff";
          const cellStyle = { background: bg };
          return (
            <tr key={`${row.stationId}-${row.dir}-${i}`}>
              <td className="name" style={cellStyle}>
                {row.filler ? null : (
                  <span className="station-cell">
                    {stationName(doc, row.stationId)}
                    <IconStrip kind="station" ids={stationIcons(doc, row.stationId)} />
                  </span>
                )}
              </td>
              <td className="dir" style={cellStyle}>
                {row.filler ? "" : row.dir}
              </td>
              {block.services.map((s) => {
                const cell = s.times[row.stationId];
                return (
                  <td
                    key={s.id}
                    className={`time${cell?.style === "italic" ? " italic" : ""}`}
                    style={cellStyle}
                  >
                    {cell?.value || ""}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PanelCard({
  doc,
  panel,
  directionMode,
  noGap,
  transparent,
}: {
  doc: TimetableDoc;
  panel: Panel;
  directionMode: DirectionMode;
  noGap?: boolean;
  transparent?: boolean;
}) {
  const pal = paletteFor(doc, panel.letter);
  const fill = pal?.fill ?? "#333";
  const text = pal?.text ?? "#fff";
  const banner = {
    label: `${panel.letter} · ${pal?.name?.toUpperCase() ?? ""} TIMETABLE`,
    fill,
    text,
  };
  const accent = { fill, text };
  const showOut = directionMode !== "inbound";
  const showIn = directionMode !== "outbound";
  return (
    <article
      className={`panel${directionMode === "stack" ? " stacked" : ""}${noGap ? " no-gap" : ""}${transparent ? " transparent-bg" : ""}`}
    >
      {showOut ? (
        <div className="panel-block">
          <Block doc={doc} block={panel.outbound} banner={banner} accent={accent} transparent={transparent} />
        </div>
      ) : null}
      {showIn ? (
        <div className="panel-block">
          <Block
            doc={doc}
            block={panel.inbound}
            banner={directionMode === "stack" ? undefined : banner}
            accent={accent}
            transparent={transparent}
            flushTop={!!noGap && directionMode === "stack" && showOut}
            followNotes={directionMode === "stack" && showOut}
          />
        </div>
      ) : null}
    </article>
  );
}

function DateGrid({
  doc,
  onPaint,
  onDayClick,
  selectedIso,
}: {
  doc: TimetableDoc;
  onPaint?: (iso: string) => void;
  onDayClick?: (iso: string, letter?: string) => void;
  selectedIso?: string;
}) {
  const months = enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div
      className="cal-grid"
      style={{ gridTemplateColumns: `minmax(64px, max-content) repeat(31, 24px)` }}
    >
      <div className="cal-corner" />
      {days.map((d) => (
        <div key={d} className="cal-sq cal-head">
          {d}
        </div>
      ))}
      {months.flatMap((m) => [
        <div key={m.id} className="cal-month">
          {m.label}
        </div>,
        ...days.map((d) => {
          if (d > m.daysInMonth) return <div key={`${m.id}-${d}`} className="cal-sq" />;
          const iso = `${m.id}-${String(d).padStart(2, "0")}`;
          const letter = doc.calendar.cells[iso];
          const pal = letter ? paletteFor(doc, letter) : undefined;
          const click = onDayClick ?? onPaint;
          const className = `cal-sq${letter ? " cal-cell" : ""}${selectedIso === iso ? " is-selected" : ""}`;
          const style = pal ? { background: pal.fill, color: pal.text } : undefined;
          const paint = () => (onDayClick ? onDayClick(iso, letter) : onPaint?.(iso));
          if (!click) {
            return (
              <div
                key={`${m.id}-${d}`}
                className={className}
                style={style}
                data-kwvr-iso={iso}
                data-kwvr-letter={letter ?? ""}
              >
                {letter ?? ""}
              </div>
            );
          }
          return (
            <button
              key={`${m.id}-${d}`}
              type="button"
              className={className}
              style={style}
              data-kwvr-iso={iso}
              data-kwvr-letter={letter ?? ""}
              aria-label={letter ? `Paint ${iso}, currently ${letter}` : `Paint ${iso}`}
              onClick={paint}
            >
              {letter ?? ""}
            </button>
          );
        }),
      ])}
    </div>
  );
}

function MonthCard({
  doc,
  year,
  monthIndex,
  label,
  onPaint,
  onDayClick,
  selectedIso,
  hideAdjacentMonths = false,
  showEvents = false,
}: {
  doc: TimetableDoc;
  year: number;
  monthIndex: number;
  label: string;
  onPaint?: (iso: string) => void;
  onDayClick?: (iso: string, letter?: string) => void;
  selectedIso?: string;
  hideAdjacentMonths?: boolean;
  showEvents?: boolean;
}) {
  const slots = monthGridSlots(year, monthIndex, doc.calendar.cells);
  const look = calendarStyle(doc);
  return (
    <div className="month-card">
      <h2>
        {label} {year}
      </h2>
      <div className="month-wd-row">
        {WEEKDAYS_MON.map((w) => (
          <div key={w} className="month-wd">
            {w}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {slots.map((s, i) => {
          const hidden = s.outside && hideAdjacentMonths;
          const pal = !hidden && s.letter ? paletteFor(doc, s.letter) : undefined;
          const iso = isoDate(s.year, s.monthIndex, s.day);
          const click = onDayClick ?? onPaint;
          const events = showEvents ? (doc.calendar.events?.[iso] ?? []) : [];
          let background: string | undefined;
          let color: string | undefined;
          if (!hidden) {
            if (pal) {
              background = s.outside ? cssFill(pal.fill, look.otherMonthsOpacity) : pal.fill;
              color = pal.text;
            } else if (s.outside) {
              background = cssFill(look.otherMonthsFill, look.otherMonthsOpacity);
            } else {
              background = cssFill(look.nonRunningFill, look.nonRunningOpacity);
            }
          }
          const className = `month-day${pal ? " cal-cell has-letter" : ""}${events.length ? " has-events" : ""}${s.outside ? " outside" : ""}${hidden ? " hidden-adj" : ""}${selectedIso === iso ? " is-selected" : ""}`;
          const style = background ? { background, color } : undefined;
          const inner = hidden ? null : (
            <span className="month-stack">
              <span className="month-head">
                <span className="month-num">{s.day}</span>
                {s.letter ? <span className={`month-letter letter-${s.letter}`}>{s.letter}</span> : null}
              </span>
              {events.length ? (
                <span className="month-events">
                  {events.map((ev, ei) => (
                    <a
                      key={`${iso}-${ei}`}
                      className="month-event"
                      href={ev.url || "#"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.title}
                    </a>
                  ))}
                </span>
              ) : null}
            </span>
          );
          if (!click || hidden) {
            return (
              <div
                key={i}
                className={className}
                style={style}
                data-kwvr-iso={iso}
                data-kwvr-letter={s.letter ?? ""}
              >
                {inner}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={className}
              style={style}
              data-kwvr-iso={iso}
              data-kwvr-letter={s.letter ?? ""}
              role="button"
              tabIndex={0}
              aria-label={s.letter ? `${label} ${s.day}, ${s.letter}` : `${label} ${s.day}`}
              onClick={() => (onDayClick ? onDayClick(iso, s.letter) : onPaint?.(iso))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (onDayClick) onDayClick(iso, s.letter);
                  else onPaint?.(iso);
                }
              }}
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimetableSheet({
  doc,
  kind,
  panelId,
  onPaint,
  onDayClick,
  selectedIso,
  directionMode = "stack",
  noGap = false,
  transparent = false,
  monthId,
  hideAdjacentMonths = false,
  showEvents = false,
}: {
  doc: TimetableDoc;
  kind: PreviewKind;
  panelId?: string;
  onPaint?: (iso: string) => void;
  onDayClick?: (iso: string, letter?: string) => void;
  selectedIso?: string;
  directionMode?: DirectionMode;
  noGap?: boolean;
  transparent?: boolean;
  monthId?: string;
  hideAdjacentMonths?: boolean;
  showEvents?: boolean;
}) {
  const panel = doc.panels.find((p) => p.id === panelId) ?? doc.panels[0];
  const months = enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount).filter(
    (m) => !monthId || m.id === monthId,
  );

  if (kind === "panel" && panel) {
    return (
      <div className={`sheet sheet-piece${transparent ? " transparent-bg" : ""}`} id="print-sheet">
        <PanelCard doc={doc} panel={panel} directionMode={directionMode} noGap={noGap} transparent={transparent} />
      </div>
    );
  }

  if (kind === "dates") {
    return (
      <div className={`sheet sheet-piece sheet-dates${transparent ? " transparent-bg" : ""}`} id="print-sheet">
        <DateGrid doc={doc} onPaint={onPaint} onDayClick={onDayClick} selectedIso={selectedIso} />
      </div>
    );
  }

  return (
    <div className={`sheet sheet-piece sheet-months${transparent ? " transparent-bg" : ""}`} id="print-sheet">
      <div className={`month-wrap${months.length === 1 ? " month-wrap-single" : ""}`}>
        {months.map((m) => (
          <MonthCard
            key={m.id}
            doc={doc}
            year={m.year}
            monthIndex={m.monthIndex}
            label={m.label}
            onPaint={onPaint}
            onDayClick={onDayClick}
            selectedIso={selectedIso}
            hideAdjacentMonths={hideAdjacentMonths}
            showEvents={showEvents}
          />
        ))}
      </div>
    </div>
  );
}
