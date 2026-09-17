import { loadIconGeom } from "./iconSvg";
import {
  calendarStyle,
  enumerateMonths,
  monthGridSlots,
  paletteFor,
  stationIcons,
  stationName,
  WEEKDAYS_MON,
} from "./model";
import type { DirectionMode, PreviewKind } from "./TimetableSheet";
import type { DirectionBlock, Panel, TimetableDoc } from "./types";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

async function iconMark(id: string, x: number, y: number, size: number, fill: string): Promise<{ svg: string; width: number }> {
  const g = await loadIconGeom(id);
  if (!g) return { svg: "", width: 0 };
  const scale = size / g.height;
  const w = g.width * scale;
  const [minX, minY] = g.vb.split(" ").map(Number);
  return {
    svg: `<g transform="translate(${x - minX * scale},${y - minY * scale}) scale(${scale})" fill="${esc(fill)}">${g.inner}</g>`,
    width: w,
  };
}

async function iconRow(ids: string[], x: number, y: number, size: number, fill: string): Promise<{ svg: string; width: number }> {
  let svg = "";
  let w = 0;
  for (const id of ids) {
    const mark = await iconMark(id, x + w, y, size, fill);
    svg += mark.svg;
    w += mark.width + 2;
  }
  return { svg, width: w };
}

function wrap(body: string, width: number, height: number, transparent = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${transparent ? "" : `<rect width="100%" height="100%" fill="#ffffff"/>`}
  <g font-family="Gill Sans, Gill Sans MT, Arial, sans-serif">${body}</g>
</svg>`;
}

export type SvgExportOpts = {
  noGap?: boolean;
  transparent?: boolean;
};

async function blockSvg(
  doc: TimetableDoc,
  block: DirectionBlock,
  y0: number,
  accent: { fill: string; text: string },
  banner: string | undefined,
  transparent: boolean,
  flushTop = false,
  followNotes = false,
): Promise<{ svg: string; height: number; width: number }> {
  const nameW = 118;
  const dirW = 20;
  const width = 780;
  const rowH = 24;
  const cols = Math.max(block.services.length, 1);
  const timeW = (width - nameW - dirW) / cols;
  const stripe = tintFill(accent.fill);
  const inkDark = "#111111";
  let y = y0;
  let svg = "";

  if (banner) {
    svg += `<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${esc(accent.fill)}"/>`;
    svg += `<text x="8" y="${y + 16}" fill="${esc(accent.text)}" font-size="13" font-weight="700">${esc(banner)}</text>`;
    y += rowH;
  }

  svg += `<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${esc(accent.fill)}"/>`;
  svg += `<text x="8" y="${y + (followNotes ? 15 : 16)}" fill="${esc(accent.text)}" font-size="13" font-weight="700">Notes</text>`;
  let nx = nameW + dirW;
  for (const s of block.services) {
    const icons = await iconRow(
      s.noteIconIds,
      nx + (timeW - 12) / 2,
      y + (followNotes ? 4 : 6),
      12,
      accent.text,
    );
    svg += icons.svg;
    nx += timeW;
  }
  y += rowH;

  for (let i = 0; i < block.rows.length; i++) {
    const row = block.rows[i];
    const bg = i % 2 === 1 ? stripe : transparent ? "" : "#ffffff";
    if (bg) svg += `<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${esc(bg)}"/>`;
    const name = row.filler ? "" : stationName(doc, row.stationId);
    if (name) {
      svg += `<text x="8" y="${y + 16}" fill="${inkDark}" font-size="13" font-weight="600">${esc(name)}</text>`;
      const nameWidth = name.length * 7.2;
      const stIcons = await iconRow(stationIcons(doc, row.stationId), 8 + nameWidth + 6, y + 5.25, 12, inkDark);
      svg += stIcons.svg;
    }
    if (!row.filler) {
      svg += `<text x="${nameW + 4}" y="${y + 16}" fill="${inkDark}" font-size="13">${esc(row.dir)}</text>`;
    }
    let tx = nameW + dirW;
    for (const s of block.services) {
      const val = s.times[row.stationId]?.value ?? "";
      const italic = s.times[row.stationId]?.style === "italic";
      svg += `<text x="${tx + timeW / 2}" y="${y + 16}" fill="${inkDark}" font-size="13" text-anchor="middle"${italic ? ' font-style="italic"' : ""}>${esc(val)}</text>`;
      tx += timeW;
    }
    y += rowH;
  }

  const height = y - y0;
  if (flushTop) {
    const x2 = Math.max(width - 1, 1);
    const y2 = y0 + Math.max(height - 1, 1);
    svg += `<path d="M1 ${y0} V${y2} H${x2} V${y0}" fill="none" stroke="${esc(accent.fill)}" stroke-width="2"/>`;
  } else {
    svg += `<rect x="1" y="${y0 + 1}" width="${Math.max(width - 2, 1)}" height="${Math.max(height - 2, 1)}" fill="none" stroke="${esc(accent.fill)}" stroke-width="2"/>`;
  }
  return { svg, height, width };
}

async function panelSvg(
  doc: TimetableDoc,
  panel: Panel,
  directionMode: DirectionMode,
  opts: SvgExportOpts = {},
): Promise<string> {
  const pal = paletteFor(doc, panel.letter);
  const fill = pal?.fill ?? "#333";
  const text = pal?.text ?? "#fff";
  const accent = { fill, text };
  const banner = `${panel.letter} · ${(pal?.name ?? "").toUpperCase()} TIMETABLE`;
  const showOut = directionMode !== "inbound";
  const showIn = directionMode !== "outbound";
  const gap = opts.noGap ? 0 : 16;
  const transparent = !!opts.transparent;
  let y = transparent ? 0 : 8;
  let width = 200;
  let body = "";
  const pad = transparent ? 0 : 8;
  if (showOut) {
    const b = await blockSvg(doc, panel.outbound, y, accent, banner, transparent);
    body += `<g transform="translate(${pad},0)">${b.svg}</g>`;
    width = Math.max(width, b.width + pad * 2);
    y += b.height + (showIn ? gap : pad);
  }
  if (showIn) {
    const b = await blockSvg(
      doc,
      panel.inbound,
      y,
      accent,
      directionMode === "stack" ? undefined : banner,
      transparent,
      !!(opts.noGap && showOut && directionMode === "stack"),
      !!(showOut && directionMode === "stack"),
    );
    body += `<g transform="translate(${pad},0)">${b.svg}</g>`;
    width = Math.max(width, b.width + pad * 2);
    y += b.height + pad;
  }
  return wrap(body, width, y, transparent);
}

function datesSvg(doc: TimetableDoc, transparent = false): string {
  const months = enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const labW = 72;
  const cell = 24;
  const width = labW + 31 * cell + 16;
  const height = (months.length + 1) * cell + 16;
  let svg = "";
  days.forEach((d, i) => {
    const x = 8 + labW + i * cell;
    svg += `<rect x="${x}" y="8" width="${cell}" height="${cell}" fill="#f3f3f3" stroke="#bbb"/>`;
    svg += `<text x="${x + cell / 2}" y="${8 + 16}" text-anchor="middle" font-size="11" fill="#111">${d}</text>`;
  });
  months.forEach((m, mi) => {
    const y = 8 + (mi + 1) * cell;
    svg += `<text x="12" y="${y + 16}" font-size="11" font-weight="600" fill="#111">${esc(m.label)}</text>`;
    days.forEach((d, i) => {
      const x = 8 + labW + i * cell;
      if (d > m.daysInMonth) {
        svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#fff" stroke="#bbb"/>`;
        return;
      }
      const iso = `${m.id}-${String(d).padStart(2, "0")}`;
      const letter = doc.calendar.cells[iso];
      const pal = letter ? paletteFor(doc, letter) : undefined;
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${esc(pal?.fill ?? "#fff")}" stroke="#bbb"/>`;
      if (letter) {
        svg += `<text x="${x + cell / 2}" y="${y + 16}" text-anchor="middle" font-size="12" font-weight="700" fill="${esc(pal?.text ?? "#111")}">${esc(letter)}</text>`;
      }
    });
  });
  return wrap(svg, width, height, transparent);
}

function monthCardSvg(
  doc: TimetableDoc,
  m: ReturnType<typeof enumerateMonths>[number],
  hideAdjacentMonths = false,
): { svg: string; width: number; height: number } {
  const cell = 52;
  const gap = 5;
  const gridW = 7 * cell + 6 * gap;
  const titleH = 28;
  const wdH = 22;
  const slots = monthGridSlots(m.year, m.monthIndex, doc.calendar.cells);
  const look = calendarStyle(doc);
  const weeks = slots.length / 7;
  const height = titleH + wdH + weeks * cell + (weeks - 1) * gap;
  const width = gridW;
  let svg = "";
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="16" font-weight="600" fill="#111">${esc(m.label)} ${m.year}</text>`;
  WEEKDAYS_MON.forEach((w, wi) => {
    const wx = wi * (cell + gap);
    svg += `<text x="${wx + cell / 2}" y="${titleH + 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#555">${w}</text>`;
  });
  slots.forEach((s, i) => {
    const c = i % 7;
    const r = Math.floor(i / 7);
    const dx = c * (cell + gap);
    const dy = titleH + wdH + r * (cell + gap);
    if (s.outside && hideAdjacentMonths) return;
    const pal = s.letter ? paletteFor(doc, s.letter) : undefined;
    const fill = pal?.fill ?? (s.outside ? look.otherMonthsFill : look.nonRunningFill);
    const opacity = pal
      ? s.outside
        ? look.otherMonthsOpacity / 100
        : 1
      : (s.outside ? look.otherMonthsOpacity : look.nonRunningOpacity) / 100;
    const fade = opacity < 1 ? ` fill-opacity="${opacity}"` : "";
    svg += `<rect x="${dx}" y="${dy}" width="${cell}" height="${cell}" rx="7" ry="7" fill="${esc(fill)}"${fade}/>`;
    const ink = pal?.text ?? "#111";
    const cx = dx + cell / 2;
    const cy = dy + cell / 2;
    if (s.letter) {
      const letterX = s.letter === "B" ? cx - 1 : s.letter === "F" ? cx + 0.5 : s.letter === "S" ? cx + 1 : cx;
      svg += `<text text-anchor="middle" font-variant="tabular-nums">`;
      svg += `<tspan x="${cx}" y="${cy - 9}" dominant-baseline="central" font-size="11" font-weight="400" fill="${esc(ink)}">${s.day}</tspan>`;
      svg += `<tspan x="${letterX}" y="${cy + 8}" dominant-baseline="central" font-size="17" font-weight="700" fill="${esc(ink)}">${esc(s.letter)}</tspan>`;
      svg += `</text>`;
    } else {
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="400" font-variant="tabular-nums" fill="${esc(ink)}" opacity="0.5">${s.day}</text>`;
    }
  });
  return { svg, width, height };
}

function monthsSvg(doc: TimetableDoc, transparent = false, monthId?: string, hideAdjacentMonths = false): string {
  const months = enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount).filter(
    (m) => !monthId || m.id === monthId,
  );
  const cell = 52;
  const gap = 5;
  const gridW = 7 * cell + 6 * gap;
  const colGap = 56;
  const rowGap = 36;
  const cols = months.length === 1 ? 1 : 2;
  const rows: ReturnType<typeof enumerateMonths>[] = [];
  for (let i = 0; i < months.length; i += cols) rows.push(months.slice(i, i + cols));
  const cards = months.map((m) => monthCardSvg(doc, m, hideAdjacentMonths));
  const byId = Object.fromEntries(months.map((m, i) => [m.id, cards[i]]));
  const rowHeights = rows.map((row) => Math.max(...row.map((m) => byId[m.id].height)));
  const width = 16 + gridW * cols + (cols === 2 ? colGap : 0);
  const height = 16 + rowHeights.reduce((a, b) => a + b, 0) + rowGap * (rows.length - 1) + 16;
  let svg = "";
  let y = 16;
  rows.forEach((row, ri) => {
    row.forEach((m, ci) => {
      const x = 16 + ci * (gridW + colGap);
      svg += `<g transform="translate(${x},${y})">${byId[m.id].svg}</g>`;
    });
    y += rowHeights[ri] + rowGap;
  });
  return wrap(svg, width, height, transparent);
}

function downloadSvg(xml: string, name: string) {
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportDocSvg(opts: {
  doc: TimetableDoc;
  kind: PreviewKind;
  panelId?: string;
  directionMode: DirectionMode;
  name: string;
  noGap?: boolean;
  transparent?: boolean;
  monthId?: string;
  hideAdjacentMonths?: boolean;
}) {
  const panel = opts.doc.panels.find((p) => p.id === opts.panelId) ?? opts.doc.panels[0];
  const svgOpts: SvgExportOpts = { noGap: opts.noGap, transparent: opts.transparent };
  let xml = "";
  if (opts.kind === "panel" && panel) xml = await panelSvg(opts.doc, panel, opts.directionMode, svgOpts);
  else if (opts.kind === "dates") xml = datesSvg(opts.doc, !!opts.transparent);
  else xml = monthsSvg(opts.doc, !!opts.transparent, opts.monthId, opts.hideAdjacentMonths);
  downloadSvg(xml, opts.name);
}

export async function exportEachMonthSvg(opts: {
  doc: TimetableDoc;
  transparent?: boolean;
  hideAdjacentMonths?: boolean;
}) {
  const months = enumerateMonths(opts.doc.calendar.startMonth, opts.doc.calendar.monthCount);
  for (const m of months) {
    const card = monthCardSvg(opts.doc, m, opts.hideAdjacentMonths);
    const xml = wrap(card.svg, card.width, card.height, !!opts.transparent);
    downloadSvg(xml, `calendar-${m.id}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function exportEachPanelSvg(opts: {
  doc: TimetableDoc;
  directionMode: DirectionMode;
  noGap?: boolean;
  transparent?: boolean;
}) {
  const svgOpts: SvgExportOpts = { noGap: opts.noGap, transparent: opts.transparent };
  for (const panel of opts.doc.panels) {
    const pal = paletteFor(opts.doc, panel.letter);
    const slug = `timetable-${panel.letter}-${(pal?.name ?? "panel").toLowerCase().replace(/\s+/g, "-")}`;
    const xml = await panelSvg(opts.doc, panel, opts.directionMode, svgOpts);
    downloadSvg(xml, slug);
    await new Promise((r) => setTimeout(r, 250));
  }
}
