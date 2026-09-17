import type {
  CalendarStyle,
  DirectionBlock,
  PaletteEntry,
  Panel,
  Service,
  Station,
  StopRow,
  TimetableDoc,
} from "./types";

export const DEFAULT_CALENDAR_STYLE: CalendarStyle = {
  nonRunningFill: "#cccccc",
  nonRunningOpacity: 100,
  otherMonthsFill: "#cccccc",
  otherMonthsOpacity: 50,
};

export function calendarStyle(doc: TimetableDoc): CalendarStyle {
  const s = doc.calendar.style;
  return {
    nonRunningFill: s?.nonRunningFill ?? DEFAULT_CALENDAR_STYLE.nonRunningFill,
    nonRunningOpacity: clampPct(s?.nonRunningOpacity ?? DEFAULT_CALENDAR_STYLE.nonRunningOpacity),
    otherMonthsFill: s?.otherMonthsFill ?? DEFAULT_CALENDAR_STYLE.otherMonthsFill,
    otherMonthsOpacity: clampPct(s?.otherMonthsOpacity ?? DEFAULT_CALENDAR_STYLE.otherMonthsOpacity),
  };
}

export function cssFill(hex: string, opacityPct: number): string {
  const o = clampPct(opacityPct);
  if (o >= 100) return hex;
  return `color-mix(in srgb, ${hex} ${o}%, transparent)`;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function uid(): string {
  return crypto.randomUUID();
}

export function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseMonthId(id: string): { year: number; monthIndex: number } {
  const [y, m] = id.split("-").map(Number);
  return { year: y, monthIndex: (m || 1) - 1 };
}

export function monthIdFrom(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function addMonths(year: number, monthIndex: number, delta: number) {
  const t = year * 12 + monthIndex + delta;
  return { year: Math.floor(t / 12), monthIndex: ((t % 12) + 12) % 12 };
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export const WEEKDAYS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function mondayIndex(year: number, monthIndex: number, day: number): number {
  const js = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return (js + 6) % 7;
}

export type MonthGridSlot = {
  day: number;
  year: number;
  monthIndex: number;
  letter?: string;
  outside: boolean;
};

export function monthGridSlots(
  year: number,
  monthIndex: number,
  cells: Record<string, string>,
): MonthGridSlot[] {
  const dim = daysInMonth(year, monthIndex);
  const lead = mondayIndex(year, monthIndex, 1);
  const prev = addMonths(year, monthIndex, -1);
  const prevDim = daysInMonth(prev.year, prev.monthIndex);
  const next = addMonths(year, monthIndex, 1);
  const slots: MonthGridSlot[] = [];
  for (let i = 0; i < lead; i++) {
    const day = prevDim - lead + 1 + i;
    slots.push({
      day,
      year: prev.year,
      monthIndex: prev.monthIndex,
      letter: cells[isoDate(prev.year, prev.monthIndex, day)],
      outside: true,
    });
  }
  for (let d = 1; d <= dim; d++) {
    slots.push({
      day: d,
      year,
      monthIndex,
      letter: cells[isoDate(year, monthIndex, d)],
      outside: false,
    });
  }
  let nextDay = 1;
  while (slots.length % 7 !== 0) {
    slots.push({
      day: nextDay,
      year: next.year,
      monthIndex: next.monthIndex,
      letter: cells[isoDate(next.year, next.monthIndex, nextDay)],
      outside: true,
    });
    nextDay += 1;
  }
  return slots;
}

export function enumerateMonths(startId: string, count: number) {
  const start = parseMonthId(startId);
  return Array.from({ length: count }, (_, i) => {
    const { year, monthIndex } = addMonths(start.year, start.monthIndex, i);
    return {
      id: monthIdFrom(year, monthIndex),
      label: MONTH_NAMES[monthIndex],
      year,
      monthIndex,
      daysInMonth: daysInMonth(year, monthIndex),
    };
  });
}

export function contrastText(fill: string): string {
  const hex = fill.replace("#", "");
  if (hex.length < 6) return "#111111";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum > 150 ? "#111111" : "#ffffff";
}

export function paletteFor(doc: TimetableDoc, letter: string): PaletteEntry | undefined {
  return doc.palette.find((p) => p.letter === letter);
}

export function stationName(doc: TimetableDoc, id: string): string {
  return doc.stations.find((s) => s.id === id)?.name ?? id;
}

export function stationIcons(doc: TimetableDoc, id: string): string[] {
  return doc.stations.find((s) => s.id === id)?.iconIds ?? [];
}

export function emptyService(rows: StopRow[]): Service {
  return {
    id: uid(),
    noteIconIds: [],
    times: Object.fromEntries(rows.map((r) => [r.stationId, { value: "" }])),
  };
}

export function fillerService(rows: StopRow[]): Service {
  return {
    id: uid(),
    noteIconIds: [],
    filler: true,
    times: Object.fromEntries(rows.map((r) => [r.stationId, { value: "-" }])),
  };
}

export function emptyBlock(rows: StopRow[], columns = 6): DirectionBlock {
  return {
    rows,
    services: Array.from({ length: columns }, () => emptyService(rows)),
  };
}

export function defaultRows(stationIds: string[], outbound: boolean): StopRow[] {
  if (outbound) {
    return stationIds.map((id, i) => ({
      stationId: id,
      dir: i === stationIds.length - 1 ? "a" : "d",
    }));
  }
  const rev = [...stationIds].reverse();
  return rev.map((id, i) => ({
    stationId: id,
    dir: i === 0 ? "d" : "a",
  }));
}

export function emptyPanel(letter: string, stations: Station[]): Panel {
  const ids = stations.map((s) => s.id);
  return {
    id: uid(),
    letter,
    outbound: emptyBlock(defaultRows(ids, true)),
    inbound: emptyBlock(defaultRows(ids, false)),
  };
}

export function moveAt<T>(list: T[], index: number, delta: number): T[] {
  const next = index + delta;
  if (next < 0 || next >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function fillerRow(): StopRow {
  return { stationId: uid(), dir: "", filler: true };
}

function cloneBlock(block: DirectionBlock): DirectionBlock {
  return {
    rows: block.rows.map((r) => ({ ...r })),
    services: block.services.map((s) => ({
      id: uid(),
      noteIconIds: [...s.noteIconIds],
      filler: s.filler,
      times: Object.fromEntries(Object.entries(s.times).map(([k, v]) => [k, { ...v }])),
    })),
  };
}

export function clonePanel(panel: Panel, letter: string): Panel {
  return {
    id: uid(),
    letter,
    outbound: cloneBlock(panel.outbound),
    inbound: cloneBlock(panel.inbound),
  };
}

export function withFillerRow(block: DirectionBlock, at = block.rows.length): DirectionBlock {
  const row = fillerRow();
  const rows = block.rows.slice();
  rows.splice(at, 0, row);
  return {
    rows,
    services: block.services.map((s) => ({
      ...s,
      times: { ...s.times, [row.stationId]: { value: "-" } },
    })),
  };
}

export function nextLetter(palette: PaletteEntry[]): string {
  const used = new Set(palette.map((p) => p.letter));
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(ch)) return ch;
  }
  return String(palette.length + 1);
}
