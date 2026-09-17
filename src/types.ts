export type TimeCell = {
  value: string;
  style?: "normal" | "italic";
};

export type Service = {
  id: string;
  noteIconIds: string[];
  times: Record<string, TimeCell>;
  filler?: boolean;
};

export type StopRow = {
  stationId: string;
  dir: "d" | "a" | "";
  filler?: boolean;
};

export type DirectionBlock = {
  rows: StopRow[];
  services: Service[];
};

export type PaletteEntry = {
  letter: string;
  name: string;
  fill: string;
  text: string;
};

export type Panel = {
  id: string;
  letter: string;
  outbound: DirectionBlock;
  inbound: DirectionBlock;
};

export type Station = {
  id: string;
  name: string;
  iconIds: string[];
};

export type DayEvent = {
  title: string;
  url: string;
};

export type CalendarStyle = {
  nonRunningFill: string;
  nonRunningOpacity: number;
  otherMonthsFill: string;
  otherMonthsOpacity: number;
};

export type TimetableDoc = {
  version: 1;
  document: {
    title: string;
    intro: string;
    specialKey: string;
    footnote: string;
  };
  palette: PaletteEntry[];
  calendar: {
    startMonth: string;
    monthCount: number;
    cells: Record<string, string>;
    events?: Record<string, DayEvent[]>;
    style?: CalendarStyle;
  };
  stations: Station[];
  panels: Panel[];
};
