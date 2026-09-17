import { exampleTimetable } from "./example";
import { calendarStyle } from "./model";
import type { TimetableDoc } from "./types";

const KEY = "kwvr-timetable-doc-v3";
const LEGACY_KEYS = ["kwvr-timetable-doc-v2", "kwvr-timetable-doc"];
const SEED_ICONS = new Set(["uF021_exclam", "uF02A_asterisk"]);

function isDamemsOrIngrow(id: string, name: string) {
  return id === "damems" || id === "ingrow" || /^damems$/i.test(name) || /^ingrow$/i.test(name);
}

export function withoutDamemsIngrowIcons(doc: TimetableDoc): TimetableDoc {
  return {
    ...doc,
    stations: doc.stations.map((s) => {
      if (!isDamemsOrIngrow(s.id, s.name)) return s;
      return { ...s, iconIds: [] };
    }),
  };
}

function withCalendarStyle(doc: TimetableDoc): TimetableDoc {
  return {
    ...doc,
    calendar: { ...doc.calendar, style: calendarStyle(doc) },
  };
}

function dropSeedStationIcons(doc: TimetableDoc): TimetableDoc {
  return {
    ...doc,
    stations: doc.stations.map((s) => {
      if (!isDamemsOrIngrow(s.id, s.name)) return s;
      return { ...s, iconIds: s.iconIds.filter((id) => !SEED_ICONS.has(id)) };
    }),
  };
}

export function loadDoc(): TimetableDoc {
  try {
    const raw = localStorage.getItem(KEY) ?? LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
    if (!raw) return withoutDamemsIngrowIcons(exampleTimetable());
    const parsed = JSON.parse(raw) as TimetableDoc;
    if (parsed?.version !== 1) return withoutDamemsIngrowIcons(exampleTimetable());
    return dropSeedStationIcons(withCalendarStyle(parsed));
  } catch {
    return withoutDamemsIngrowIcons(exampleTimetable());
  }
}

export function saveDoc(doc: TimetableDoc) {
  localStorage.setItem(KEY, JSON.stringify(dropSeedStationIcons(doc)));
}
