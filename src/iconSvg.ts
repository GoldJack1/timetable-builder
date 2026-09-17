export type IconGeom = {
  inner: string;
  vb: string;
  width: number;
  height: number;
};

function bboxFromPath(d: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const tokens = d.match(/[MmLlHhVvCcQqTtSsAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return null;
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (px: number, py: number) => {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  };
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === "Z" || cmd === "z") continue;
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd) {
      case "M":
      case "m":
      case "L":
      case "l":
      case "T":
      case "t": {
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        add(x, y);
        if (cmd === "M") cmd = "L";
        if (cmd === "m") cmd = "l";
        break;
      }
      case "H":
      case "h": {
        const nx = num();
        x = rel ? x + nx : nx;
        add(x, y);
        break;
      }
      case "V":
      case "v": {
        const ny = num();
        y = rel ? y + ny : ny;
        add(x, y);
        break;
      }
      case "Q":
      case "q":
      case "S":
      case "s": {
        const x1 = num();
        const y1 = num();
        const nx = num();
        const ny = num();
        const cx = rel ? x + x1 : x1;
        const cy = rel ? y + y1 : y1;
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        add(cx, cy);
        add(x, y);
        break;
      }
      case "C":
      case "c": {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        const nx = num();
        const ny = num();
        add(rel ? x + x1 : x1, rel ? y + y1 : y1);
        add(rel ? x + x2 : x2, rel ? y + y2 : y2);
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        add(x, y);
        break;
      }
      case "A":
      case "a": {
        num();
        num();
        num();
        num();
        num();
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        add(x, y);
        break;
      }
      default:
        i += 1;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

export function parseIconSvg(raw: string): IconGeom | null {
  const attrs = [...raw.matchAll(/<path\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const ds: string[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const a of attrs) {
    const d = a.match(/\bd="([^"]+)"/)?.[1];
    if (!d) continue;
    ds.push(d);
    const b = bboxFromPath(d);
    if (!b) continue;
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  if (!ds.length || !Number.isFinite(minX)) return null;
  const pad = Math.max(maxX - minX, maxY - minY) * 0.03;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    width,
    height,
    vb: `${minX} ${minY} ${width} ${height}`,
    inner: ds.map((d) => `<path d="${d}"/>`).join(""),
  };
}

const cache = new Map<string, Promise<IconGeom | null>>();

export function loadIconGeom(id: string): Promise<IconGeom | null> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/icons/brface3/${id}.svg`)
      .then((r) => r.text())
      .then(parseIconSvg)
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}
